//! `oui list`：列出 hub 上的包。

use anyhow::{bail, Context, Result};
use serde_json::{json, Value};

use crate::cred::resolve_registry;
use crate::style;

pub(crate) async fn cmd_list(registry: &Option<String>) -> Result<()> {
    let reg = resolve_registry(registry);
    let url = format!("{reg}/v/index.json");
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.with_context(|| format!("请求 hub 失败: {url}"))?;
    let status = resp.status();
    let body: Value = resp.json().await.unwrap_or_else(|_| json!({ "packages": [] }));
    if !status.is_success() {
        bail!("{}", body["error"].as_str().unwrap_or("unknown error"));
    }
    let pkgs = body["packages"].as_array().cloned().unwrap_or_default();
    if pkgs.is_empty() {
        style::out(style::warn("hub 上暂无包"));
        return Ok(());
    }
    let rows: Vec<(String, String)> = pkgs
        .iter()
        .map(|p| {
            let scope = p["scope"].as_str().unwrap_or("");
            let name = p["name"].as_str().unwrap_or("");
            let latest = p["latest"].as_str().unwrap_or("-");
            (format!("{scope}/{name}"), style::accent(latest).to_string())
        })
        .collect();
    let count = rows.len();
    style::table(("包名", "最新版本"), &rows, Some(format!("共 {count} 个包")));
    Ok(())
}
