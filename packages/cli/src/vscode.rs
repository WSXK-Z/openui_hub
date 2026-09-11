//! `.vscode/settings.json` 的 file nesting 维护（把 oui 相关文件折叠进 `oui.json`）。

use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};

use crate::cred::os_home;
use crate::text::{find_string_value_of, find_value_pos, insert_into_object, read_string_value, replace_string_value};

/// VS Code 折叠：父文件 → 子文件名（逗号分隔）。
/// `oui.d.ts` / `oui.lock.json` / `oui.components.json` 是固定名。
pub(crate) const NEST_PARENT: &str = "oui.json";
pub(crate) const NEST_CHILDREN: [&str; 3] = ["oui.d.ts", "oui.lock.json", "oui.components.json"];

/// 定位 `.vscode` 目录：从工程根起向上最多 5 层找已存在的 `.vscode`（monorepo 布局下
/// 通常落在仓库根），搜索不超过用户主目录；找不到 → 工程根下的 `.vscode`（由调用方创建）。
pub(crate) fn find_vscode_dir(root: &Path) -> PathBuf {
    let home = os_home();
    let mut dir: Option<&Path> = Some(root);
    for _ in 0..=5 {
        let Some(d) = dir else { break };
        if home.as_deref() == Some(d) {
            break;
        }
        let candidate = d.join(".vscode");
        if candidate.is_dir() {
            return candidate;
        }
        dir = d.parent();
    }
    root.join(".vscode")
}

/// 修 `.vscode/settings.json`：开启 file nesting，并把 oui 相关文件
/// （oui.d.ts / oui.lock.json / oui.components.json）折叠进 oui.json。
/// `oui init` 与 `oui fix` 共用（幂等：已就绪则不改动）。
pub(crate) fn fix_vscode_settings(root: &Path) -> Result<()> {
    let dir = find_vscode_dir(root);
    let file = dir.join("settings.json");
    if !file.is_file() {
        fs::create_dir_all(&dir).with_context(|| format!("创建目录失败: {}", dir.display()))?;
        let content = format!(
            "{{\n  \"explorer.fileNesting.enabled\": true,\n  \"explorer.fileNesting.patterns\": {{\n    \"{NEST_PARENT}\": \"{}\"\n  }}\n}}\n",
            NEST_CHILDREN.join(", ")
        );
        fs::write(&file, content).with_context(|| format!("写入失败: {}", file.display()))?;
        println!("已创建 {}（file nesting）", file.display());
        return Ok(());
    }

    let text = fs::read_to_string(&file).with_context(|| format!("读取失败: {}", file.display()))?;
    let mut next = text.clone();
    let mut notes: Vec<&str> = Vec::new();

    // 1) fileNesting.enabled → true
    if next.contains("\"explorer.fileNesting.enabled\"") {
        if let Some(pos) = find_value_pos(&next, "explorer.fileNesting.enabled")
            && next[pos..].starts_with("false")
        {
            next.replace_range(pos..pos + 5, "true");
            notes.push("开启 fileNesting");
        }
    } else if let Some(fn_pos) = next.find("\"fileNesting\"") {
        // 嵌套样式：在 fileNesting 对象里处理 enabled
        let tail = next[fn_pos..].to_string();
        if let Some(rel) = find_value_pos(&tail, "enabled") {
            let abs = fn_pos + rel;
            if next[abs..].starts_with("false") {
                next.replace_range(abs..abs + 5, "true");
                notes.push("开启 fileNesting");
            }
        } else if let Some(s) = insert_into_object(&next, "fileNesting", "\"enabled\": true") {
            next = s;
            notes.push("开启 fileNesting");
        }
    } else if let Some(pos) = next.find('{') {
        next.insert_str(pos + 1, "\n  \"explorer.fileNesting.enabled\": true,");
        notes.push("开启 fileNesting");
    }

    // 2) patterns：补全 oui.json 的子项（固定名 + 各连接的 overlay）
    let merged = merged_children(&next);
    match merged {
        ChildState::Already => {}
        ChildState::Merged(value) => {
            next = if let Some(pos) = find_string_value_of(&next, NEST_PARENT) {
                replace_string_value(&next, pos, &value)
            } else if next.contains("\"explorer.fileNesting.patterns\"") {
                insert_into_object(&next, "explorer.fileNesting.patterns", &format!("\"{NEST_PARENT}\": \"{value}\"")).unwrap_or(next)
            } else if next.contains("\"patterns\"") {
                insert_into_object(&next, "patterns", &format!("\"{NEST_PARENT}\": \"{value}\"")).unwrap_or(next)
            } else if next.contains("\"fileNesting\"") {
                insert_into_object(&next, "fileNesting", &format!("\"patterns\": {{ \"{NEST_PARENT}\": \"{value}\" }},")).unwrap_or(next)
            } else if let Some(pos) = next.find('{') {
                let mut s = next.clone();
                s.insert_str(pos + 1, &format!("\n  \"explorer.fileNesting.patterns\": {{ \"{NEST_PARENT}\": \"{value}\" }},"));
                s
            } else {
                next
            };
            notes.push("折叠 oui.json 相关文件");
        }
        ChildState::Missing => {
            next = if next.contains("\"explorer.fileNesting.patterns\"") {
                insert_into_object(&next, "explorer.fileNesting.patterns", &format!("\"{NEST_PARENT}\": \"{}\"", NEST_CHILDREN.join(", "))).unwrap_or(next)
            } else if next.contains("\"patterns\"") {
                insert_into_object(&next, "patterns", &format!("\"{NEST_PARENT}\": \"{}\"", NEST_CHILDREN.join(", "))).unwrap_or(next)
            } else if next.contains("\"fileNesting\"") {
                insert_into_object(&next, "fileNesting", &format!("\"patterns\": {{ \"{NEST_PARENT}\": \"{}\" }},", NEST_CHILDREN.join(", "))).unwrap_or(next)
            } else if let Some(pos) = next.find('{') {
                let mut s = next.clone();
                s.insert_str(pos + 1, &format!("\n  \"explorer.fileNesting.patterns\": {{ \"{NEST_PARENT}\": \"{}\" }},", NEST_CHILDREN.join(", ")));
                s
            } else {
                next
            };
            notes.push("折叠 oui.json 相关文件");
        }
    }

    if next == text {
        println!("{}：已就绪，未改动", file.display());
        return Ok(());
    }
    fs::write(&file, next).with_context(|| format!("写入失败: {}", file.display()))?;
    println!("已更新 {}（file nesting）", file.display());
    Ok(())
}

/// fileNesting 子项检查结果。
pub(crate) enum ChildState {
    /// patterns 已含全部 oui 相关子项（无需写入）
    Already,
    /// 已有 patterns，但需把 oui 相关子项合并进去
    Merged(String),
    /// patterns 尚未写入 oui.json 条目
    Missing,
}

/// 现有 patterns 里 oui.json 的子项状态。
pub(crate) fn merged_children(text: &str) -> ChildState {
    let Some(pos) = find_string_value_of(text, NEST_PARENT) else {
        return ChildState::Missing;
    };
    let (value, _) = read_string_value(text, pos);
    let mut list: Vec<String> = value
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let mut changed = false;
    for c in NEST_CHILDREN {
        if !list.iter().any(|x| x == c) {
            list.push(c.to_string());
            changed = true;
        }
    }
    if changed {
        ChildState::Merged(list.join(", "))
    } else {
        ChildState::Already
    }
}
