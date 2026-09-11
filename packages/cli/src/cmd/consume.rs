//! `oui use`：锁定远程组件（remote，写入 oui.lock.json）或复制组件源码（source）。

use std::fs;

use anyhow::{anyhow, bail, Context, Result};
use serde_json::{json, Value};

use crate::config::{project_root, read_defaults, LOCK_FILE, LOCK_SCHEMA};
use crate::cred::resolve_or_prompt_registry;
use crate::types::{configure_types, fetch_pkg_types, has_remote_types, report_types, type_paths_of};

/// 解析包规格：@scope/name 或 @scope/name@version → (base, 期望版本)。
pub(crate) fn split_pkg_spec(pkg: &str) -> Result<(String, Option<String>)> {
    let rest = pkg.trim_start_matches('/');
    let (base, want_version) = match rest.rsplit_once('@') {
        Some((b, v)) if b.contains('/') && !v.is_empty() => (b.to_string(), Some(v.to_string())),
        _ => (rest.to_string(), None),
    };
    if !base.starts_with('@') || base.split('/').count() != 2 {
        bail!("包名格式错误（应为 @scope/name 或 @scope/name@version）: {pkg}");
    }
    Ok((base, want_version))
}

pub(crate) async fn cmd_use(pkg: &str, registry: &Option<String>, mode: &str, with_types: bool) -> Result<()> {
    match mode {
        "remote" => cmd_use_remote(pkg, registry, with_types).await,
        "source" => cmd_use_source(pkg, registry).await,
        other => bail!("不支持的 mode: {other}（remote | source）"),
    }
}

pub(crate) async fn cmd_use_remote(pkg: &str, registry: &Option<String>, with_types: bool) -> Result<()> {
    let (base, want_version) = split_pkg_spec(pkg)?;

    let reg = resolve_or_prompt_registry(registry.as_deref(), "从哪个 hub 获取该组件")?;
    let url = format!("{reg}/resolve/{base}");
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.with_context(|| format!("请求 hub 失败: {url}"))?;
    let status = resp.status();
    let body: Value = resp.json().await.unwrap_or_else(|_| json!({ "error": "无法解析响应" }));
    if !status.is_success() {
        let msg = body["error"].as_str().unwrap_or("unknown error");
        bail!("{msg}");
    }
    let version = body["version"].as_str().unwrap_or_default().to_string();
    if let Some(w) = &want_version
        && w != &version
    {
        bail!("版本不匹配：请求 {w}，但 {base} 的 latest 为 {version}");
    }

    // lock 写到工程根（路由文件所在目录；无配置取最近含 package.json 的祖先），文件名取 oui.json 的 lockFile
    let cwd = std::env::current_dir()?;
    let (root, _) = project_root(&cwd);

    // 类型声明（可选）：从 resolve 的 entry.types/typesFiles 下载到 oui-types/<name>/<version>/
    let types_entry = body["entry"]["types"].as_str().map(str::to_string);
    let types_files: Vec<String> = body["entry"]["typesFiles"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    if let (Some(entry), false) = (&types_entry, types_files.is_empty()) {
        match fetch_pkg_types(&client, &reg, &base, &version, entry, &types_files, &root).await {
            Ok(files) => println!("已落盘 {base}@{version} 的类型声明（{} 个文件）", files.len()),
            Err(e) => println!("{base}@{version} 类型声明落盘失败：{e}"),
        }
    } else {
        println!("{base}@{version} 未提供类型声明（消费端按 any 处理）");
    }

    let lock_name = read_defaults(&root)
        .map(|c| c.lock_file_name())
        .unwrap_or_else(|| LOCK_FILE.to_string());
    let lock_path = root.join(&lock_name);
    let mut lock: Value = if lock_path.is_file() {
        serde_json::from_slice(&fs::read(&lock_path)?).unwrap_or(json!({}))
    } else {
        json!({})
    };
    let obj = lock.as_object_mut().ok_or_else(|| anyhow!("{} 顶层应为 JSON 对象", lock_path.display()))?;
    obj.entry("$schema".to_string()).or_insert_with(|| json!(LOCK_SCHEMA));
    if !obj.get("packages").is_some_and(Value::is_object) {
        obj.insert("packages".into(), json!({}));
    }
    let packages = obj["packages"].as_object_mut().ok_or_else(|| anyhow!("lock 文件结构异常: packages 应为对象"))?;
    // 只固定版本与来源 hub 地址；产物路径/样式/类型由该版本的 manifest 决定
    packages.insert(base.clone(), json!({ "version": version, "registry": reg }));
    let out = serde_json::to_string_pretty(&lock)?;
    fs::write(&lock_path, format!("{out}\n"))?;

    println!("已锁定 {base}@{version}（{reg}）→ {lock_name}");
    // 有本地类型就接（tsconfig paths 指向 oui-types/<pkg>/index.d.ts）；无类型时保持通配 any
    if with_types || !type_paths_of(&root, &lock).is_empty() {
        report_types(&configure_types(&root));
    } else if !has_remote_types(&root) {
        println!("已登记 {base}@{version} 并更新 tsconfig");
    }
    println!("构建期接入：安装 @openui_hub/plugin_vite 并在 vite.config 添加 hubVite()；代码中 import {{ Button }} from 'oui-hub:{base}'");
    Ok(())
}

/// source 模式：把包的源码文件复制到 <cwd>/src/components/oui/<slug>/（按 basename 平铺）。
pub(crate) async fn cmd_use_source(pkg: &str, registry: &Option<String>) -> Result<()> {
    let (base, want_version) = split_pkg_spec(pkg)?;
    let reg = resolve_or_prompt_registry(registry.as_deref(), "从哪个 hub 获取该组件")?;
    let client = reqwest::Client::new();

    // resolve → 版本
    let url = format!("{reg}/resolve/{base}");
    let resp = client.get(&url).send().await.with_context(|| format!("请求 hub 失败: {url}"))?;
    let status = resp.status();
    let body: Value = resp.json().await.unwrap_or_else(|_| json!({ "error": "无法解析响应" }));
    if !status.is_success() {
        bail!("{}", body["error"].as_str().unwrap_or("unknown error"));
    }
    let version = body["version"].as_str().unwrap_or_default().to_string();
    if let Some(w) = &want_version
        && w != &version
    {
        bail!("版本不匹配：请求 {w}，但 {base} 的 latest 为 {version}");
    }

    // manifest → source.files
    let manifest_url = format!("{reg}/v/{base}@{version}/manifest.json");
    let resp = client
        .get(&manifest_url)
        .send()
        .await
        .with_context(|| format!("请求 hub 失败: {manifest_url}"))?;
    let status = resp.status();
    let m: Value = resp.json().await.unwrap_or_else(|_| json!({ "error": "无法解析响应" }));
    if !status.is_success() {
        bail!("{}", m["error"].as_str().unwrap_or("unknown error"));
    }
    let files: Vec<String> = m["source"]["files"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    if files.is_empty() {
        bail!("{base}@{version} 未携带源码（发布端需在 oui.json 配置 source 并重新构建发布）");
    }
    let css_strategy = m["cssStrategy"].as_str().unwrap_or("vanilla").to_string();

    // 逐文件拉取 → 目标目录按 basename 平铺
    // 源码复制到工程根（配置所在目录；无配置取最近含 package.json 的祖先）下的 src/components/oui/<slug>
    let slug = base.split('/').nth(1).unwrap_or(&base).to_string();
    let cwd = std::env::current_dir()?;
    let (root, _) = project_root(&cwd);
    let target = root.join("src").join("components").join("oui").join(&slug);
    fs::create_dir_all(&target).with_context(|| format!("创建目录失败: {}", target.display()))?;

    let mut copied = 0usize;
    for f in &files {
        let rel = f
            .strip_prefix("source/")
            .ok_or_else(|| anyhow!("manifest source 路径应带 source/ 前缀: {f}"))?;
        let file_url = format!("{reg}/v/{base}@{version}/source/{rel}");
        let resp = client
            .get(&file_url)
            .send()
            .await
            .with_context(|| format!("请求 hub 失败: {file_url}"))?;
        if !resp.status().is_success() {
            bail!("请求失败: HTTP {}", resp.status());
        }
        let content = resp.bytes().await.with_context(|| format!("读取源码失败: {f}"))?;
        let name = rel.rsplit('/').next().unwrap_or(rel);
        let dst = target.join(name);
        fs::write(&dst, content).with_context(|| format!("写入失败: {}", dst.display()))?;
        copied += 1;
    }

    println!("已复制 {copied} 个源文件到 {}", target.display());
    println!("{base}@{version} 源码已落盘（mode=source，不写入 lock）");
    if css_strategy != "vanilla" {
        println!("提示：该包 cssStrategy={css_strategy}，原子类策略需接入工程配置 UnoCSS");
    }
    println!("接入：在 src/components/oui/{slug}/index.ts（如有）导出；注意源码为按文件名的平铺布局");
    Ok(())
}
