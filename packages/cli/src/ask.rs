//! 交互式输入原语（输入提示、默认值、y/N 问答、hub 地址询问）。

use anyhow::{bail, Result};

use crate::cred::{default_registry, known_registries};
use crate::style;

/// 询问 hub 地址（默认取 default_registry；非交互直接取用）。
pub(crate) fn prompt_registry(label: &str, flag: Option<&str>) -> Result<String> {
    let chosen = flag.map(str::trim).filter(|s| !s.is_empty()).map(String::from);
    let known = known_registries();
    let default = chosen.clone().unwrap_or_else(default_registry);
    let hint = if known.is_empty() { default.clone() } else { known.join(", ") };
    let value = match chosen {
        Some(v) => v,
        None => prompt_default(label, &hint)?,
    };
    if value.trim().is_empty() {
        bail!("hub 地址不能为空");
    }
    Ok(value.trim().trim_end_matches('/').to_string())
}

/// 交互式读取一行（去首尾空白）。stdin 无输入（EOF：非交互/CI）→ 报错。
pub(crate) fn prompt(label: &str, hint: &str) -> Result<String> {
    style::ask(label, hint)?;
    let mut line = String::new();
    if std::io::stdin().read_line(&mut line)? == 0 {
        bail!("需要交互输入；CI 场景请用 --no-input");
    }
    Ok(line.trim().to_string())
}

/// 带默认值的输入提示（回车采用 default，输入则覆盖）。
pub(crate) fn prompt_default(label: &str, default: &str) -> Result<String> {
    let v = prompt(label, default)?;
    Ok(if v.is_empty() { default.to_string() } else { v })
}

/// y/N 问答（回车取 default_yes）。
pub(crate) fn prompt_yes(label: &str, default_yes: bool) -> Result<bool> {
    let v = prompt(label, if default_yes { "Y/n" } else { "y/N" })?;
    Ok(if v.is_empty() {
        default_yes
    } else {
        matches!(v.to_ascii_lowercase().as_str(), "y" | "yes")
    })
}
