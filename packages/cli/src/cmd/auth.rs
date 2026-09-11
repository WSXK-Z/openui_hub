//! `oui login` / `oui hub`：hub 连接的录入、删除与列出（写入 `~/.oui/credentials.json`）。

use anyhow::{bail, Result};

use crate::ask::prompt_default;
use crate::config::DEFAULT_REGISTRY;
use crate::cred::{
    connection_named, cred_path, mask_secret, read_cred, write_cred, CredConnection,
    DEFAULT_CONNECTION,
};

/// `oui login`：交互式（或参数）录入 hub 地址/令牌并命名连接，写入 `~/.oui/credentials.json`。
pub(crate) fn cmd_login(
    name: Option<&str>,
    registry: Option<&str>,
    token: Option<&str>,
    no_input: bool,
) -> Result<()> {
    let store = read_cred();
    let cur_name = store.default.clone().unwrap_or_else(|| DEFAULT_CONNECTION.to_string());
    let cur = connection_named(Some(&cur_name)).map(|(_, c)| c);

    // 1) 连接名
    let name = match name.map(str::trim).filter(|s| !s.is_empty()) {
        Some(n) => n.to_string(),
        None if no_input => cur_name.clone(),
        None => prompt_default("connection name", &cur_name)?,
    };
    if name.is_empty() || name.contains(char::is_whitespace) {
        bail!("连接名不能为空且不能含空白: {name}");
    }

    // 2) registry（默认：flag > 现有连接的 registry > 内置默认）
    let def_registry = registry
        .map(str::to_string)
        .or_else(|| cur.as_ref().map(|c| c.registry.clone()))
        .unwrap_or_else(|| DEFAULT_REGISTRY.to_string());
    let registry = match registry.map(str::trim).filter(|s| !s.is_empty()) {
        Some(r) => r.to_string(),
        None if no_input => def_registry.clone(),
        None => prompt_default("registry", &def_registry)?,
    };
    if !registry.starts_with("http") {
        bail!("registry 需为 http(s) 地址: {registry}");
    }

    // 3) 令牌（默认沿用现有连接）
    let def_token = token
        .map(str::to_string)
        .or_else(|| cur.as_ref().and_then(|c| c.token.clone()))
        .unwrap_or_default();
    let token = match token.map(str::trim).filter(|s| !s.is_empty()) {
        Some(t) => t.to_string(),
        None if no_input => def_token.clone(),
        None => prompt_default("令牌（token，可空）", &def_token)?,
    };

    // 4) 写凭据文件
    let mut store = store;
    store.connections.insert(
        name.clone(),
        CredConnection { registry: registry.clone(), token: (!token.is_empty()).then(|| token.clone()) },
    );
    if store.default.is_none() {
        store.default = Some(name.clone());
    }
    write_cred(&store)?;

    let masked = if token.is_empty() {
        "no token".to_string()
    } else {
        mask_secret(&token)
    };
    println!("已保存连接 {name}（registry={registry}，token={masked}）→ {}", cred_path().display());
    Ok(())
}

pub(crate) fn cmd_hub_add(name: Option<&str>, registry: Option<&str>, token: Option<&str>, no_input: bool) -> Result<()> {
    cmd_login(name, registry, token, no_input)
}

pub(crate) fn cmd_hub_delete(name: &str) -> Result<()> {
    let mut store = read_cred();
    if store.connections.remove(name).is_none() { bail!("未找到连接 {name}"); }
    if store.default.as_deref() == Some(name) { store.default = store.connections.keys().next().cloned(); }
    write_cred(&store)?;
    match &store.default {
        Some(d) => println!("已删除连接 {name}；默认连接：{d}"),
        None => println!("已删除连接 {name}；已无其它连接"),
    }
    Ok(())
}

pub(crate) fn cmd_hub_list() -> Result<()> {
    let store = read_cred();
    if store.connections.is_empty() {
        println!("未配置任何 hub 连接；请先运行 `oui hub add`");
        return Ok(());
    }
    for (name, conn) in store.connections {
        let marker = if store.default.as_deref() == Some(name.as_str()) { "*" } else { " " };
        println!("{marker} {name}\t{}", conn.registry);
    }
    Ok(())
}
