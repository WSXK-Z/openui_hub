//! `oui register`：把待发布组件登记进 `oui.components.json`。

use anyhow::{bail, Result};
use serde_json::{json, Value};

use crate::ask::{prompt_default, prompt_registry};
use crate::config::{
    is_scoped_name, is_version, project_root, read_components, read_json, read_package_json,
    split_list, upsert_component, ComponentsFile, COMPONENTS_FILE,
};
use crate::cred::default_registry;

/// `oui register` 的参数。
pub(crate) struct RegisterArgs {
    pub(crate) pkg: String,
    pub(crate) version: Option<String>,
    pub(crate) entry: Option<String>,
    pub(crate) source: Vec<String>,
    pub(crate) description: Option<String>,
    pub(crate) kind: Option<String>,
    pub(crate) css_strategy: Option<String>,
    pub(crate) out_dir: Option<String>,
    pub(crate) types: Option<String>,
    pub(crate) registry: Option<String>,
    pub(crate) no_input: bool,
}

/// `oui register <@scope/name>`：把组件 upsert 进 `oui.components.json` 的 components[]，
/// 并记录该组件发布到的 hub 地址（未指定时交互询问）。
/// 缺 version/entry 时交互式补问（`--no-input` 则直接报错）；保留数组内其他条目原样。
pub(crate) fn cmd_register(args: RegisterArgs) -> Result<()> {
    let RegisterArgs {
        pkg, version, entry, source, description, kind, css_strategy, out_dir, types, registry, no_input,
    } = args;
    let name = pkg.trim();
    if !is_scoped_name(name) {
        bail!("包名格式错误（应为 @scope/name）: {name}");
    }
    let cwd = std::env::current_dir()?;
    // 工程根 = oui.json 所在目录；entry/source/outDir 相对它
    let (root, _) = project_root(&cwd);
    let path = root.join(COMPONENTS_FILE);
    if path.is_file() && read_json::<ComponentsFile>(&path).is_none() {
        bail!("{} 存在但解析失败（JSON 畸形或字段类型错误）；请先修正，避免覆盖已有配置", path.display());
    }
    let existing = read_components(&root).into_iter().find(|x| x.name == name);

    // 默认值来源：已登记条目 → 项目 package.json
    let pj_version = read_package_json(&root).map(|(v, _)| v).filter(|v| !v.is_empty());
    let def_version = existing
        .as_ref()
        .map(|c| c.version.clone())
        .filter(|v| !v.is_empty())
        .or(pj_version);
    let def_entry = existing.as_ref().and_then(|c| c.entry.clone()).unwrap_or_default();
    let def_source = existing
        .as_ref()
        .and_then(|c| c.source.as_ref())
        .map(|s| s.join(", "))
        .unwrap_or_default();
    let def_desc = existing
        .as_ref()
        .and_then(|c| c.description.clone())
        .unwrap_or_default();

    // version
    let version = match version.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(v) => {
            if !is_version(v) {
                bail!("版本格式错误（应为 x.y.z）: {v}");
            }
            v.to_string()
        }
        None if no_input => bail!("缺少 --version x.y.z（--no-input 模式不询问）"),
        None => loop {
            let v = prompt_default("组件 version", &def_version.clone().unwrap_or_else(|| "0.1.0".into()))?;
            if is_version(&v) {
                break v;
            }
            eprintln!("版本格式错误（应为 x.y.z）: {v}");
        },
    };

    // entry
    let entry = match entry.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(e) => e.to_string(),
        None if no_input => bail!("缺少 --entry <组件源入口>（--no-input 模式不询问）"),
        None => loop {
            let e = prompt_default("entry", &def_entry)?;
            if !e.is_empty() {
                break e;
            }
            eprintln!("entry 不能为空");
        },
    };

    // source / description
    let source = if !source.is_empty() {
        split_list(&source)
    } else if no_input {
        Vec::new()
    } else {
        split_list(&[prompt_default("source files", &def_source)?])
    };
    let description = match description.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(d) => d.to_string(),
        None if no_input => String::new(),
        None => prompt_default("组件 description（可空）", &def_desc)?,
    };

    // hub 地址：--registry > 已登记值 > 交互询问（--no-input 用默认）
    let registry = match registry.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        Some(r) => r.trim_end_matches('/').to_string(),
        None => match existing.as_ref().and_then(|c| c.registry.clone()) {
            Some(r) => r,
            None if no_input => default_registry(),
            None => prompt_registry("该组件发布到的 hub 地址", None)?,
        },
    };

    // 保真 upsert（未知字段/其他条目原样保留；null 值＝清除该键）
    let mut patch = serde_json::Map::new();
    patch.insert("version".into(), json!(version));
    patch.insert("entry".into(), json!(entry));
    patch.insert("registry".into(), json!(registry));
    if !source.is_empty() {
        patch.insert("source".into(), json!(source));
    }
    if !description.is_empty() {
        patch.insert("description".into(), json!(description));
    }
    for (key, val) in [("type", kind.as_ref()), ("cssStrategy", css_strategy.as_ref())] {
        if let Some(v) = val.filter(|s| !s.is_empty()) {
            patch.insert(key.into(), json!(v));
        }
    }
    if let Some(o) = out_dir.as_deref().filter(|s| !s.is_empty()) {
        patch.insert("outDir".into(), json!(o));
    }
    match types.as_deref().map(str::trim) {
        None => {}
        Some("") => {
            patch.insert("types".into(), Value::Null); // 清除 → 回到自动推导
        }
        Some("false") => {
            patch.insert("types".into(), json!(false));
        }
        Some(t) => {
            patch.insert("types".into(), json!(t));
        }
    }

    let count = upsert_component(&root, name, patch)?;
    println!("已登记组件 {name}@{version} → {registry}（components 共 {count} 项）");
    println!("发布：先 vite build（或 SubPackage 构建），再执行 oui publish");
    Ok(())
}
