//! `oui create`：按 hub 组件契约生成组件模板并登记到 `oui.components.json`。

use std::fs;

use anyhow::{bail, Context, Result};
use serde_json::json;

use crate::ask::{prompt_default, prompt_registry};
use crate::config::{
    is_scoped_name, is_version, project_root, read_components, read_package_json, upsert_component,
    PKG_CONFIG,
};
use crate::cred::default_registry;
use crate::decl::fix_component_decl_pipeline;
use crate::text::write_if_changed;

/// `oui create` 的参数（未给项按 已登记条目 > oui.json > 内置默认 继承）。
pub(crate) struct CreateArgs {
    pub(crate) pkg: String,
    pub(crate) dir: Option<String>,
    pub(crate) version: Option<String>,
    pub(crate) title: Option<String>,
    pub(crate) description: Option<String>,
    pub(crate) kind: Option<String>,
    pub(crate) css_strategy: Option<String>,
    pub(crate) uno: bool,
    pub(crate) no_uno: bool,
    pub(crate) registry: Option<String>,
    pub(crate) no_register: bool,
    pub(crate) force: bool,
    pub(crate) no_input: bool,
}

impl CreateArgs {
    /// 任一参数给出（或 `--no-input`）＝非交互模式：缺项取继承值/内置默认。
    fn is_param_mode(&self) -> bool {
        self.no_input
            || self.dir.is_some()
            || self.version.is_some()
            || self.title.is_some()
            || self.description.is_some()
            || self.kind.is_some()
            || self.css_strategy.is_some()
            || self.uno
            || self.no_uno
            || self.registry.is_some()
            || self.no_register
            || self.force
    }
}

/// `oui create <@scope/name>`：按 hub 组件契约生成 `<dir>/index.ts`（默认导出描述对象
/// `{ name, title, description, meta, component }`，并具名导出组件本体）与 `<dir>/<Slug>.vue`；
/// 默认登记进 `oui.components.json`，并补齐组件声明产出链路（tsconfig.dts.json / build 前置）。
pub(crate) fn cmd_create(args: CreateArgs) -> Result<()> {
    let name = args.pkg.trim();
    if !is_scoped_name(name) {
        bail!("包名格式错误（应为 @scope/name）: {name}");
    }
    let slug = name.rsplit('/').next().unwrap_or_default();
    if !slug.starts_with(|c: char| c.is_ascii_alphabetic()) {
        bail!("组件名末段需以字母开头（作为导出标识符）: {name}");
    }
    let cwd = std::env::current_dir()?;
    let (root, defaults) = project_root(&cwd);
    let Some(cfg) = defaults else {
        bail!("当前目录及上级未找到 {PKG_CONFIG}——先运行 `oui init` 再创建组件");
    };
    let existing = read_components(&root).into_iter().find(|c| c.name == name);
    let param = args.is_param_mode();

    // 继承链：flag > 已登记条目 > oui.json > 内置默认
    let kind = args
        .kind
        .clone()
        .or_else(|| cfg.kind.clone())
        .unwrap_or_else(|| "vue-component".to_string());
    if kind != "vue-component" {
        bail!("oui create 目前只支持 type=vue-component（当前：{kind}）");
    }
    let css_strategy = args
        .css_strategy
        .clone()
        .or_else(|| cfg.css_strategy.clone())
        .unwrap_or_else(|| "vanilla".to_string());
    let uno = if args.no_uno {
        false
    } else if args.uno {
        true
    } else {
        cfg.uno.unwrap_or(false)
    };
    // 原子类模板 = 启用 uno 或非 vanilla 策略（样式由构建期 unocss 生成，模板不写 style 块）
    let atomic = uno || css_strategy != "vanilla";

    let pascal = pascal_case(slug);
    let def_version = existing
        .as_ref()
        .map(|c| c.version.clone())
        .filter(|v| !v.is_empty())
        .or_else(|| read_package_json(&root).map(|(v, _)| v).filter(|v| !v.is_empty()))
        .unwrap_or_else(|| "0.1.0".to_string());
    let def_description = existing.as_ref().and_then(|c| c.description.clone()).unwrap_or_default();

    let version = match args.version.clone().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        Some(v) => {
            if !is_version(&v) {
                bail!("版本格式错误（应为 x.y.z）: {v}");
            }
            v
        }
        None if param => def_version,
        None => loop {
            let v = prompt_default("组件 version", &def_version)?;
            if is_version(&v) {
                break v;
            }
            eprintln!("版本格式错误（应为 x.y.z）: {v}");
        },
    };
    let title = match args.title.clone().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        Some(t) => t,
        None if param => pascal.clone(),
        None => prompt_default("展示标题", &pascal)?,
    };
    let description = match args.description.clone() {
        Some(d) => d.trim().to_string(),
        None if param => def_description,
        None => prompt_default("组件描述（可空）", &def_description)?,
    };

    // 组件目录（必须落在工程根内；路径以正斜杠写入配置）
    let dir = root.join(args.dir.clone().unwrap_or_else(|| format!("src/ui/{slug}")));
    let Ok(rel) = dir.strip_prefix(&root) else {
        bail!("组件目录需位于工程根 {} 内: {}", root.display(), dir.display());
    };
    let dir_rel = rel.to_string_lossy().replace('\\', "/");
    if dir_rel.is_empty() || dir_rel == "." {
        bail!("组件目录不能是工程根自身");
    }
    // 目录内除本次要写的两个文件外还有其它内容时，需 --force 才继续
    let vue_name = format!("{pascal}.vue");
    if dir.is_dir() {
        let extra: Vec<String> = fs::read_dir(&dir)
            .with_context(|| format!("读取目录失败: {}", dir.display()))?
            .flatten()
            .map(|e| e.file_name().to_string_lossy().to_string())
            .filter(|n| n != "index.ts" && n != &vue_name)
            .collect();
        if !extra.is_empty() && !args.force {
            bail!(
                "{} 已存在其它文件（{}）；确认在其中生成模板请加 --force",
                dir.display(),
                extra.join("、")
            );
        }
    }

    // hub 地址：--no-register 时完全不涉及；否则 flag > 已登记值 > 非交互默认/交互询问
    let registry = if args.no_register {
        None
    } else {
        Some(match args.registry.clone().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
            Some(r) => r.trim_end_matches('/').to_string(),
            None => match existing.as_ref().and_then(|c| c.registry.clone()) {
                Some(r) => r,
                None if param => default_registry(),
                None => prompt_registry("该组件发布到的 hub 地址", None)?,
            },
        })
    };

    fs::create_dir_all(&dir).with_context(|| format!("创建目录失败: {}", dir.display()))?;
    let entry_rel = format!("{dir_rel}/index.ts");
    let vue_rel = format!("{dir_rel}/{vue_name}");

    let mut created: Vec<String> = Vec::new();
    for (rel, content) in [
        (entry_rel.clone(), component_entry_content(name, &title, &description, &pascal)),
        (vue_rel.clone(), component_sfc_content(slug, atomic)),
    ] {
        let path = root.join(&rel);
        match write_if_changed(&path, &content) {
            Ok(true) => created.push(rel),
            Ok(false) => {}
            Err(()) => bail!("写入失败: {}", path.display()),
        }
    }
    if created.is_empty() {
        println!("模板文件已是最新：{entry_rel}、{vue_rel}");
    } else {
        println!("已创建 {}", created.join("、"));
    }

    match &registry {
        Some(reg) => {
            let mut patch = serde_json::Map::new();
            patch.insert("version".into(), json!(version));
            patch.insert("entry".into(), json!(entry_rel));
            patch.insert("source".into(), json!([entry_rel, vue_rel]));
            patch.insert("registry".into(), json!(reg));
            if !description.is_empty() {
                patch.insert("description".into(), json!(description));
            }
            let count = upsert_component(&root, name, patch)?;
            println!("已登记组件 {name}@{version} → {reg}（components 共 {count} 项）");
        }
        None => println!("已跳过登记（--no-register）；需要时运行 `oui register {name}`"),
    }
    fix_component_decl_pipeline(&root)?;
    println!("后续：构建工程（如 `pnpm build`）→ `oui publish`");
    Ok(())
}

/// `slug` → 导出标识符用的 PascalCase：`button` → `Button`、`data-table` → `DataTable`。
pub(crate) fn pascal_case(slug: &str) -> String {
    let mut out = String::new();
    for part in slug.split(['-', '_']).filter(|p| !p.is_empty()) {
        let mut chars = part.chars();
        if let Some(c) = chars.next() {
            out.extend(c.to_uppercase());
            out.push_str(chars.as_str());
        }
    }
    out
}

/// 组件入口文件内容（hub 组件契约）：默认导出描述对象 `{ name, title, description, meta, component }`，
/// 并具名导出组件本体。
pub(crate) fn component_entry_content(name: &str, title: &str, description: &str, pascal: &str) -> String {
    let mut s = String::new();
    s.push_str("/**\n");
    s.push_str(&format!(" * {title} 组件入口 —— hub 组件契约：\n"));
    s.push_str(" * - 默认导出组件描述对象 { name, title, description, meta, component }：component 为组件本体，\n");
    s.push_str(" *   运行时/预览按它渲染；其余字段为展示与扩展元信息。\n");
    s.push_str(&format!(
        " * - 具名导出组件本体，供构建期使用方 `import {{ {pascal} }} from 'oui-hub:{name}'`。\n"
    ));
    s.push_str(" * - 只依赖 peer 声明的依赖与组件目录内文件（构建期会把裸导入改写为宿主解析结果）。\n");
    s.push_str(" */\n");
    s.push_str(&format!("import {pascal} from './{pascal}.vue'\n\n"));
    s.push_str(&format!("export {{ {pascal} }}\n\n"));
    s.push_str("export default {\n");
    s.push_str(&format!("  name: {},\n", json!(name)));
    s.push_str(&format!("  title: {},\n", json!(title)));
    s.push_str(&format!("  description: {},\n", json!(description)));
    s.push_str("  meta: {},\n");
    s.push_str(&format!("  component: {pascal},\n"));
    s.push_str("}\n");
    s
}

/// 组件实现文件内容：`atomic`（uno 或非 vanilla 策略）用原子类、不写样式块（构建期由 unocss 生成），
/// 否则用 `<style scoped>` 手写样式。
pub(crate) fn component_sfc_content(slug: &str, atomic: bool) -> String {
    let mut s = String::new();
    s.push_str("<script setup lang=\"ts\">\n");
    s.push_str("withDefaults(\n");
    s.push_str("  defineProps<{\n");
    s.push_str("    /** 文案（未提供默认插槽时显示） */\n");
    s.push_str("    label?: string\n");
    s.push_str("  }>(),\n");
    s.push_str("  { label: '' },\n");
    s.push_str(")\n");
    s.push_str("</script>\n\n");
    s.push_str("<template>\n");
    s.push_str(&format!(
        "  <div class=\"{}\">\n",
        if atomic { "inline-flex items-center".to_string() } else { format!("oui-{slug}") }
    ));
    s.push_str("    <slot>{{ label }}</slot>\n");
    s.push_str("  </div>\n");
    s.push_str("</template>\n");
    if !atomic {
        s.push_str("\n<style scoped>\n");
        s.push_str(&format!(".oui-{slug} {{\n  display: inline-flex;\n  align-items: center;\n}}\n"));
        s.push_str("</style>\n");
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pascal_case_converts_kebab_and_snake() {
        assert_eq!(pascal_case("button"), "Button");
        assert_eq!(pascal_case("data-table"), "DataTable");
        assert_eq!(pascal_case("a_b-c"), "ABC");
        assert_eq!(pascal_case("tag2"), "Tag2");
    }

    #[test]
    fn entry_content_follows_hub_contract() {
        let s = component_entry_content("@oui/card", "Card", "卡片容器", "Card");
        // 描述对象字段顺序固定：name / title / description / meta / component
        let order: Vec<usize> = ["name:", "title:", "description:", "meta:", "component:"]
            .iter()
            .map(|k| s.find(k).unwrap_or_else(|| panic!("缺字段 {k}:\n{s}")))
            .collect();
        assert!(order.windows(2).all(|w| w[0] < w[1]), "字段顺序不符:\n{s}");
        assert!(s.contains("import Card from './Card.vue'"));
        assert!(s.contains("export { Card }"));
        assert!(s.contains("component: Card,"));
        // 字符串值按 JSON 转义（含引号/反斜杠也安全）
        assert!(s.contains("name: \"@oui/card\","), "name 应写成 JSON 字符串:\n{s}");
    }

    #[test]
    fn sfc_content_switches_style_block_by_strategy() {
        let vanilla = component_sfc_content("card", false);
        assert!(vanilla.contains("class=\"oui-card\""));
        assert!(vanilla.contains("<style scoped>"));
        assert!(vanilla.contains(".oui-card {"));

        let atomic = component_sfc_content("data-card", true);
        assert!(atomic.contains("class=\"inline-flex items-center\""));
        assert!(!atomic.contains("<style"), "原子类模板不应写样式块:\n{atomic}");
    }
}
