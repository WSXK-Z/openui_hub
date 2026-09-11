//! `oui init`：生成/更新 `oui.json`（CLI 配置与公共默认值）。

use std::path::{Path, PathBuf};

use anyhow::{bail, Result};
use serde_json::Value;

use crate::ask::{prompt_default, prompt_yes};
use crate::config::{
    merged_defaults_value, project_root, read_defaults, read_json, read_package_json, write_pkg_config,
    InitOut, PkgConfigFile, LOCK_FILE, PKG_CONFIG,
};
use crate::types::{configure_types, has_remote_types, report_types};
use crate::vscode::fix_vscode_settings;

/// `oui init` 的参数（参数模式）。未给的项继承现有配置或默认值。
pub(crate) struct InitArgs {
    pub(crate) dist: Option<String>,
    pub(crate) kind: Option<String>,
    pub(crate) css_strategy: Option<String>,
    pub(crate) uno: bool,
    pub(crate) lock_file: Option<String>,
    pub(crate) tsconfig: bool,
    pub(crate) yes: bool,
}

impl InitArgs {
    /// 是否走参数模式：给出任一 flag 即为非交互（`--yes` 单独出现仍进向导）。
    fn is_param_mode(&self) -> bool {
        self.dist.is_some()
            || self.kind.is_some()
            || self.css_strategy.is_some()
            || self.uno
            || self.lock_file.is_some()
            || self.tsconfig
    }
}

/// oui init：无参数 → 交互式向导；给任一 flag → 参数模式（CI）。
/// 只写公共默认值到 `oui.json`（组件清单见 oui.components.json，锁定见 oui.lock.json）；
/// 写配置后同步 `.vscode/settings.json` 的 explorer.fileNesting。
pub(crate) fn cmd_init(args: InitArgs) -> Result<()> {
    let cwd = std::env::current_dir()?;
    // 工程根 = 配置文件所在目录（无配置时取最近的含 package.json 的祖先）
    let (root, _routing) = project_root(&cwd);
    let path = root.join(PKG_CONFIG);
    // 配置文件存在但解析失败 → 拒绝覆写（否则会静默丢掉已有默认值）
    if path.is_file() && read_json::<PkgConfigFile>(&path).is_none() {
        bail!("{} 存在但解析失败（JSON 畸形或字段类型错误）；请先修正，避免覆盖已有配置", path.display());
    }
    let existing = read_defaults(&root);
    if args.is_param_mode() {
        init_param(args, &root, &path, existing)
    } else {
        init_wizard(args, &path, existing)
    }
}

/// 参数模式：写入 type / cssStrategy / outDir / uno / lockFile 等公共默认值。
/// 组件登记不在此处，使用 `oui register <@scope/name>`。
pub(crate) fn init_param(
    args: InitArgs,
    cwd: &std::path::Path,
    path: &std::path::Path,
    existing: Option<PkgConfigFile>,
) -> Result<()> {
    let peer_from_pkg = read_package_json(cwd).map(|(_, p)| p).unwrap_or_default();
    let ex = existing.as_ref();

    let kind = args
        .kind
        .or_else(|| ex.and_then(|c| c.kind.clone()))
        .unwrap_or_else(|| "vue-component".to_string());
    let css_strategy = args
        .css_strategy
        .or_else(|| ex.and_then(|c| c.css_strategy.clone()))
        .unwrap_or_else(|| "vanilla".to_string());
    let out_dir = args
        .dist
        .or_else(|| ex.map(PkgConfigFile::out_root))
        .unwrap_or_else(|| "pkg".to_string());
    let lock_file = args
        .lock_file
        .filter(|s| !s.is_empty())
        .or_else(|| ex.and_then(|c| c.lock_file.clone()))
        .unwrap_or_else(|| LOCK_FILE.to_string());
    // --uno 是布尔开关：给了 → true；未给 → 继承现有值
    let uno = args.uno || ex.and_then(|c| c.uno).unwrap_or(false);
    let peer = ex.and_then(|c| c.peer.clone()).unwrap_or(peer_from_pkg);

    write_pkg_config(
        path,
        &InitOut { kind, css_strategy, out_dir, uno, lock_file, peer },
    )?;
    if args.tsconfig {
        report_types(&configure_types(cwd));
    }
    // 同步 .vscode/settings.json 的 explorer.fileNesting（折叠 oui.d.ts / lock / oui.*.json）
    fix_vscode_settings(cwd)
}

/// 交互式向导：逐项问答 + 默认值（回车取默认），保留已有配置，最后确认覆盖。
pub(crate) fn init_wizard(args: InitArgs, path: &std::path::Path, existing: Option<PkgConfigFile>) -> Result<()> {
    let ex = existing.as_ref();
    let cur_kind = ex.and_then(|c| c.kind.clone());
    let cur_css = ex.and_then(|c| c.css_strategy.clone());
    let cur_out = ex.and_then(|c| c.out_dir.clone());
    let cur_lock = ex.and_then(|c| c.lock_file.clone());

    // 1. type
    let kind_default = cur_kind.clone().unwrap_or_else(|| "vue-component".to_string());
    let kind = prompt_default("type", &kind_default)?;
    // 2. cssStrategy
    let css_default = cur_css.clone().unwrap_or_else(|| "vanilla".to_string());
    let css_strategy = loop {
        let v = prompt_default("cssStrategy (vanilla | atomic-unocss | atomic-var)", &css_default)?;
        if matches!(v.as_str(), "vanilla" | "atomic-unocss" | "atomic-var") {
            break v;
        }
        eprintln!("cssStrategy 只能是 vanilla | atomic-unocss | atomic-var");
    };
    // 3. outDir
    let out_default = cur_out.clone().unwrap_or_else(|| "pkg".to_string());
    let out_dir = prompt_default("outDir", &out_default)?;
    // 4. uno
    let uno = prompt_yes("启用 UnoCSS 原子类支持？", ex.and_then(|c| c.uno).unwrap_or(false))?;
    // 5. lockFile
    let lock_default = cur_lock.clone().unwrap_or_else(|| LOCK_FILE.to_string());
    let lock_file = prompt_default("lock file", &lock_default)?;
    // 组件登记不在此处：用 `oui register <@scope/name>`（发布侧）与 `oui use <@scope/name>`（使用侧）
    println!("提示：登记待发布组件用 `oui register <@scope/name>`；使用他人组件用 `oui use <@scope/name>`");
    let peer = ex.and_then(|c| c.peer.clone()).unwrap_or_default();
    let out = InitOut {
        kind,
        css_strategy,
        out_dir,
        uno,
        lock_file,
        peer,
    };

    // 6. 已有文件 → 打印将写入的配置摘要并确认覆盖（--yes 直接写）
    let targets = init_targets(path, &out)?;
    if !args.yes && targets.iter().any(|(file, _)| file.is_file()) {
        for (file, value) in &targets {
            println!("将写入 {}", file.display());
            println!("{}", serde_json::to_string_pretty(value)?);
        }
        if !prompt_yes("确认覆盖以上配置？", true)? {
            println!("已取消，未修改 {}", path.display());
            return Ok(());
        }
    }
    write_pkg_config(path, &out)?;

    // 7. 远程组件类型接入（oui.d.ts 引用 / tsconfig 登记）
    let root = cwd_root(path);
    let enable_types = if args.tsconfig {
        true
    } else if has_remote_types(root) {
        let where_ = if root.join("env.d.ts").is_file() { root.join("env.d.ts") } else { root.join("tsconfig.json") };
        println!("{} 已接入远程组件类型", where_.display());
        false
    } else {
        prompt_yes("接入远程组件类型（建 oui.d.ts 并登记进 tsconfig）？", false)?
    };
    if enable_types {
        report_types(&configure_types(root));
    }
    // 同步 .vscode/settings.json 的 explorer.fileNesting（折叠 oui.d.ts / oui.lock.json / oui.components.json）
    fix_vscode_settings(root)?;
    Ok(())
}

/// init 将写入的配置内容（`oui.json`）。
pub(crate) fn init_targets(path: &Path, o: &InitOut) -> Result<Vec<(PathBuf, Value)>> {
    Ok(vec![(path.to_path_buf(), merged_defaults_value(path, o)?)])
}

/// 取父目录（配置所在目录的基准）。
pub(crate) fn cwd_root(path: &std::path::Path) -> &std::path::Path {
    path.parent().unwrap_or(path)
}
