//! `oui fix`：工程修复（本地类型声明、类型接入、组件声明链路、file nesting）。

use anyhow::{bail, Result};

use crate::config::{project_root, LockFile, PKG_CONFIG};
use crate::cred::resolve_registry;
use crate::decl::fix_component_decl_pipeline;
use crate::style;
use crate::types::{configure_types, repair_type_cache, report_types, sync_type_shims};
use crate::vscode::fix_vscode_settings;

/// `oui fix`：在 oui.json 所在工程根检查并修复
/// 1) 声明缓存（node_modules/.hub-cache/types）：缺失则按 lock 的版本从 hub 重新拉取并重建转发入口；
/// 2) 类型接入（oui.d.ts + tsconfig 引用/登记 + 有类型包的 paths 映射，含过期映射值校正）；
/// 3) 组件工程（oui.components.json 里未显式关闭类型的条目）的声明产出链路：补 tsconfig.dts.json 与 build 脚本前置；
/// 4) .vscode/settings.json 的 explorer.fileNesting（开启 + 折叠 oui 相关文件）。
pub(crate) async fn cmd_fix(registry: &Option<String>) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let (root, found) = project_root(&cwd);
    if found.is_none() {
        bail!("当前目录及上级未找到 {PKG_CONFIG}——先运行 `oui init` 或 `oui register <@scope/name>`");
    }
    style::out(format!("{} {}", style::strong("工程根："), style::muted(root.display())));
    let lock = LockFile::read(&root);
    repair_type_cache(&root, &lock, &resolve_registry(registry)).await;
    let missing = sync_type_shims(&root, &lock)?;
    if !missing.is_empty() {
        style::out(style::warn(format!(
            "仍有声明缓存缺失：{}（重新运行 oui fix 或检查 hub 可达性）",
            missing.iter().map(|(n, v)| format!("{n}@{v}")).collect::<Vec<_>>().join("、")
        )));
    }
    report_types(&configure_types(&root));
    fix_component_decl_pipeline(&root)?;
    fix_vscode_settings(&root)
}
