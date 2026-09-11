//! 用户级凭据（`~/.oui/credentials.json`）：连接（hub 地址 + 令牌）的读写与解析。

use std::{
    collections::BTreeMap,
    fs,
    path::PathBuf,
};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::ask::prompt_registry;
use crate::config::DEFAULT_REGISTRY;

/// 系统用户主目录（`USERPROFILE`(Windows) > `HOME`(unix)）。
pub(crate) fn os_home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
}

/// 凭据根目录：`OUI_HOME` > 用户主目录 > `.`。
pub(crate) fn oui_home() -> PathBuf {
    std::env::var_os("OUI_HOME")
        .map(PathBuf::from)
        .or_else(os_home)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// 凭据文件：`<home>/.oui/credentials.json`（含 token，**不要**放进仓库）。
pub(crate) fn cred_path() -> PathBuf {
    oui_home().join(".oui").join("credentials.json")
}

pub(crate) const DEFAULT_CONNECTION: &str = "default";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct CredConnection {
    pub(crate) registry: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) token: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub(crate) struct CredStore {
    /// 默认连接名（`oui login` 未指定名字时使用）
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) default: Option<String>,
    #[serde(default)]
    pub(crate) connections: BTreeMap<String, CredConnection>,
}

pub(crate) fn read_cred() -> CredStore {
    fs::read(cred_path())
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

pub(crate) fn write_cred(store: &CredStore) -> Result<()> {
    let path = cred_path();
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).with_context(|| format!("创建目录失败: {}", dir.display()))?;
    }
    fs::write(&path, format!("{}\n", serde_json::to_string_pretty(store)?))
        .with_context(|| format!("写入凭据失败: {}", path.display()))?;
    Ok(())
}

/// 按名取连接；`name=None` 时用凭据文件里的 default。
pub(crate) fn connection_named(name: Option<&str>) -> Option<(String, CredConnection)> {
    let store = read_cred();
    let key = match name {
        Some(n) if !n.is_empty() => n.to_string(),
        _ => store.default.clone()?,
    };
    store.connections.get(&key).map(|c| (key.clone(), c.clone()))
}

/// hub 地址：flag > env OUI_REGISTRY > 凭据默认连接 > 内置默认。
pub(crate) fn resolve_registry(opt: &Option<String>) -> String {
    opt.clone()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(default_registry)
}

/// hub 地址：flag/env 显式给出则直接采用，否则交互询问（默认值取 `default_registry`）。
pub(crate) fn resolve_or_prompt_registry(flag: Option<&str>, label: &str) -> Result<String> {
    let explicit = flag
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .or_else(|| {
            std::env::var("OUI_REGISTRY")
                .ok()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        });
    match explicit {
        Some(r) => Ok(r.trim_end_matches('/').to_string()),
        None => prompt_registry(label, None),
    }
}

/// 按 hub 地址取凭据里的令牌（同地址的连接）。
pub(crate) fn token_for_registry(registry: &str) -> Option<String> {
    let store = read_cred();
    let want = registry.trim_end_matches('/');
    store
        .connections
        .values()
        .find(|c| c.registry.trim_end_matches('/') == want)
        .and_then(|c| c.token.clone())
        .filter(|t| !t.is_empty())
}

/// 默认 hub 地址：环境变量 `OUI_REGISTRY` > 凭据里的默认连接 > 内置默认。
pub(crate) fn default_registry() -> String {
    std::env::var("OUI_REGISTRY")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            let store = read_cred();
            store.default.as_ref().and_then(|n| store.connections.get(n)).map(|c| c.registry.clone())
        })
        .unwrap_or_else(|| DEFAULT_REGISTRY.to_string())
}

/// 凭据里配置过的 hub 地址（去重，用作询问时的候选项）。
pub(crate) fn known_registries() -> Vec<String> {
    let store = read_cred();
    let mut out: Vec<String> = Vec::new();
    for conn in store.connections.values() {
        if !conn.registry.is_empty() && !out.contains(&conn.registry) {
            out.push(conn.registry.clone());
        }
    }
    if let Some(d) = store.default.as_ref().and_then(|n| store.connections.get(n)) {
        out.retain(|r| r != &d.registry);
        out.insert(0, d.registry.clone());
    }
    out
}

/// 令牌脱敏显示：保留前 8 位与后 4 位。
pub(crate) fn mask_secret(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= 12 {
        return "*".repeat(chars.len());
    }

    let head: String = chars[..8].iter().collect();
    let tail: String = chars[chars.len() - 4..].iter().collect();
    format!("{head}...{tail}")
}

/// 解析发布令牌：flag > env OUI_TOKEN > 凭据里同 hub 地址的连接持有者。
pub(crate) fn resolve_publish_token(flag: &Option<String>, registry: &str) -> Option<String> {
    if let Some(t) = flag.clone() {
        return Some(t);
    }
    if let Ok(t) = std::env::var("OUI_TOKEN")
        && !t.is_empty()
    {
        return Some(t);
    }
    token_for_registry(registry)
}
