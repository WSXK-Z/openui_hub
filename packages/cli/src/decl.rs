//! 组件工程声明产出链路：`tsconfig.dts.json` 生成、build 脚本前置与 vue-tsc/tsc 选择。

use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};

use crate::config::{read_components, types_disabled, PkgComponent, DTS_TSCONFIG};
use crate::text::{json_string_value, replace_json_string_value};

/// 组件工程（oui.json 的 components 里有未显式关闭类型的条目）的声明产出链路修复：
/// 1) 缺 `tsconfig.dts.json` → 按工程布局生成（只产 .d.ts，输出到 .oui-hub/types/，随构建临时区清理）；
/// 2) package.json 的 build 脚本缺声明前置 → 补上（.vue 用 vue-tsc，纯 TS 用 tsc）。
///
/// 全部条目显式 `types: false`（或未登记任何组件）的工程（纯使用者项目）不碰任何文件。
pub(crate) fn fix_component_decl_pipeline(root: &Path) -> Result<()> {
    let components = read_components(root);
    if components.iter().all(|c| c.types.as_ref().is_some_and(types_disabled)) {
        return Ok(());
    }

    let cfg_path = root.join(DTS_TSCONFIG);
    if !cfg_path.is_file() {
        fs::write(&cfg_path, dts_tsconfig_content(root, &components))
            .with_context(|| format!("写入失败: {}", cfg_path.display()))?;
        println!("已生成 {}（组件声明产出）", cfg_path.display());
    }

    let cmd = decl_cmd(root, &components);
    if cmd.starts_with("vue-tsc") && !has_dep(root, "vue-tsc") {
        println!("提示：未检测到 vue-tsc（.vue 组件产声明需要它）——请先 `pnpm add -D vue-tsc`");
    }

    let pkg_json = root.join("package.json");
    let Ok(text) = fs::read_to_string(&pkg_json) else {
        println!("提示：未找到 {}，构建脚本需前置 `{cmd} &&`", pkg_json.display());
        return Ok(());
    };
    let Some(build) = json_string_value(&text, "build") else {
        println!("提示：package.json 无 build 脚本——请加上 `\"build\": \"{cmd} && vite build\"`");
        return Ok(());
    };
    if build.contains(DTS_TSCONFIG) {
        return Ok(());
    }
    match replace_json_string_value(&text, "build", &format!("{cmd} && {build}")) {
        Some(next) => {
            fs::write(&pkg_json, next).with_context(|| format!("写入失败: {}", pkg_json.display()))?;
            println!("已在 package.json 的 build 脚本前置 `{cmd} &&`");
        }
        None => println!("提示：package.json 的 build 脚本未改动，请自行前置 `{cmd} &&`"),
    }
    Ok(())
}

/// 工程或其祖先的 node_modules 里是否存在该依赖（pnpm 会把依赖提升到工作区根）。
pub(crate) fn has_dep(root: &Path, name: &str) -> bool {
    let mut dir: Option<&Path> = Some(root);
    while let Some(d) = dir {
        if d.join("node_modules").join(name).is_dir() {
            return true;
        }
        dir = d.parent();
    }
    false
}

/// 声明产出的驱动命令：工程含 .vue 组件用 vue-tsc（tsc 不解析 SFC），否则用 tsc。
pub(crate) fn decl_cmd(root: &Path, components: &[PkgComponent]) -> String {
    let has_vue = has_vue_files(&decl_root_dir(root, components), 0)
        || components.iter().any(|c| {
            c.entry.as_deref().is_some_and(|e| e.ends_with(".vue"))
                || c.source.as_ref().is_some_and(|s| s.iter().any(|f| f.ends_with(".vue")))
        });
    let tool = if has_vue { "vue-tsc" } else { "tsc" };
    format!("{tool} -p {DTS_TSCONFIG}")
}

/// 声明产出的源码根：优先 `src/`，否则取各组件 entry 目录的公共前缀，兜底工程根。
pub(crate) fn decl_root_dir(root: &Path, components: &[PkgComponent]) -> PathBuf {
    if root.join("src").is_dir() {
        return root.join("src");
    }
    let dirs: Vec<String> = components
        .iter()
        .filter_map(|c| c.entry.as_deref())
        .map(|e| e.rsplit_once('/').map(|(d, _)| d.to_string()).unwrap_or_default())
        .filter(|d| !d.is_empty())
        .collect();
    let mut common: Option<Vec<&str>> = None;
    for d in &dirs {
        let segs: Vec<&str> = d.split('/').collect();
        common = Some(match common {
            None => segs,
            Some(prev) => prev
                .into_iter()
                .zip(segs.iter().copied())
                .take_while(|(a, b)| a == b)
                .map(|(a, _)| a)
                .collect(),
        });
    }
    match common {
        Some(segs) if !segs.is_empty() => root.join(segs.join("/")),
        _ => root.to_path_buf(),
    }
}

/// 声明产出的 `tsconfig.dts.json` 模板（与工程布局对齐；目录为工程根时用 `**/*` 通配）。
pub(crate) fn dts_tsconfig_content(root: &Path, components: &[PkgComponent]) -> String {
    let dir_root = decl_root_dir(root, components);
    let dir = dir_root
        .strip_prefix(root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();
    let (root_dir, ts, vue) = if dir.is_empty() {
        (".", "**/*.ts".to_string(), "**/*.vue".to_string())
    } else {
        (dir.as_str(), format!("{dir}/**/*.ts"), format!("{dir}/**/*.vue"))
    };
    format!(
        "{{\n  \"compilerOptions\": {{\n    \"target\": \"ESNext\",\n    \"module\": \"ESNext\",\n    \"moduleResolution\": \"bundler\",\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"declaration\": true,\n    \"emitDeclarationOnly\": true,\n    \"rootDir\": \"{root_dir}\",\n    \"outDir\": \".oui-hub/types\"\n  }},\n  \"include\": [\"{ts}\", \"{vue}\"]\n}}\n"
    )
}

/// src 树下是否存在 .vue（用于提示 vue-tsc；深度上限防御性递归）。
pub(crate) fn has_vue_files(dir: &Path, depth: usize) -> bool {
    if depth > 6 {
        return false;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return false;
    };
    for e in entries.flatten() {
        let p = e.path();
        let name = e.file_name();
        let name = name.to_string_lossy();
        if name == "node_modules" || name.starts_with('.') {
            continue;
        }
        if p.is_dir() {
            if has_vue_files(&p, depth + 1) {
                return true;
            }
        } else if name.ends_with(".vue") {
            return true;
        }
    }
    false
}
