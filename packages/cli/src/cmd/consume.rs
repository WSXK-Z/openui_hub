//! `oui use`：锁定远程组件（remote，写入 oui.lock.json）或复制组件源码（source）。

use std::fs;

use anyhow::{anyhow, bail, Context, Result};
use serde_json::{json, Value};

use crate::config::{lock_file_name, project_root, LockFile, LockVersion};
use crate::cred::resolve_or_prompt_registry;
use crate::style;
use crate::types::{
    configure_types, fetch_pkg_types, has_remote_types, report_types, sync_type_shims, type_paths_of,
};

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

pub(crate) async fn cmd_use(
    pkg: &str,
    registry: &Option<String>,
    mode: &str,
    with_types: bool,
    make_default: bool,
) -> Result<()> {
    match mode {
        "remote" => cmd_use_remote(pkg, registry, with_types, make_default).await,
        "source" => cmd_use_source(pkg, registry).await,
        other => bail!("不支持的 mode: {other}（remote | source）"),
    }
}

/// 取某版本的 manifest（`/v/<name>@<version>/manifest.json`，与 latest 无关）。
async fn fetch_manifest(client: &reqwest::Client, reg: &str, name: &str, version: &str) -> Result<Value> {
    let url = format!("{reg}/v/{name}@{version}/manifest.json");
    let resp = client.get(&url).send().await.with_context(|| format!("请求 hub 失败: {url}"))?;
    let status = resp.status();
    let body: Value = resp.json().await.unwrap_or_else(|_| json!({ "error": "无法解析响应" }));
    if !status.is_success() {
        bail!("{}@{} 未找到（{}）", name, version, body["error"].as_str().unwrap_or("unknown error"));
    }
    Ok(body)
}

/// 取 latest 的 package 信息（`/resolve/<name>`）。
async fn fetch_latest(client: &reqwest::Client, reg: &str, name: &str) -> Result<Value> {
    let url = format!("{reg}/resolve/{name}");
    let resp = client.get(&url).send().await.with_context(|| format!("请求 hub 失败: {url}"))?;
    let status = resp.status();
    let body: Value = resp.json().await.unwrap_or_else(|_| json!({ "error": "无法解析响应" }));
    if !status.is_success() {
        bail!("{}", body["error"].as_str().unwrap_or("unknown error"));
    }
    Ok(body)
}

pub(crate) async fn cmd_use_remote(
    pkg: &str,
    registry: &Option<String>,
    with_types: bool,
    make_default: bool,
) -> Result<()> {
    let (base, want_version) = split_pkg_spec(pkg)?;
    let reg = resolve_or_prompt_registry(registry.as_deref(), "从哪个 hub 获取该组件")?;
    let client = reqwest::Client::new();

    // 版本：显式给了就直取该版本 manifest，否则取 latest
    let body = match &want_version {
        Some(v) => fetch_manifest(&client, &reg, &base, v).await?,
        None => fetch_latest(&client, &reg, &base).await?,
    };
    let version = body["version"].as_str().unwrap_or_default().to_string();
    if version.is_empty() {
        bail!("hub 响应缺少 version: {base}");
    }

    // lock 写到工程根（路由文件所在目录；无配置取最近含 package.json 的祖先），文件名取 oui.json 的 lockFile
    let cwd = std::env::current_dir()?;
    let (root, _) = project_root(&cwd);

    // 类型声明（可选）：从 resolve 的 entry.types/typesFiles 下载到
    // node_modules/.hub-cache/types/<name>/<version>/（与构建期模块缓存同根）
    let types_entry = body["entry"]["types"].as_str().map(str::to_string);
    let types_files: Vec<String> = body["entry"]["typesFiles"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    if let (Some(entry), false) = (&types_entry, types_files.is_empty()) {
        match fetch_pkg_types(&client, &reg, &base, &version, entry, &types_files, &root).await {
            Ok(files) => style::out(format!(
                "{} {} 的类型声明（{} 个文件）",
                style::ok("已落盘"),
                style::strong(format!("{base}@{version}")),
                files.len()
            )),
            Err(e) => style::out(style::warn(format!("{base}@{version} 类型声明落盘失败：{e}"))),
        }
    } else {
        style::out(format!(
            "{} 未提供类型声明（消费端按 any 处理）",
            style::strong(format!("{base}@{version}"))
        ));
    }

    let lock_name = lock_file_name(&root);
    let mut lock = LockFile::read(&root);
    let entry = lock.packages.entry(base.clone()).or_default();
    let is_default = entry.default.is_none()        // 首次锁定即默认
        || want_version.is_none()                    // 不带版本 → 默认指向 latest
        || make_default;                             // --default 显式切换
    if is_default {
        entry.default = Some(version.clone());
    }
    entry
        .versions
        .insert(version.clone(), LockVersion { registry: Some(reg.clone()) });
    lock.write(&root)?;

    // 声明缓存入口（包级入口转发 default 版本；缺失的版本入口交给 `oui fix` 重拉）
    let missing = sync_type_shims(&root, &lock)?;

    style::out(format!(
        "{} {}（{}）→ {}",
        style::ok("已锁定"),
        style::strong(format!("{base}@{version}")),
        style::accent(&reg),
        style::muted(&lock_name)
    ));
    if is_default {
        style::out(format!(
            "{}不带版本号的导入（{}）指向该版本",
            style::muted("默认版本："),
            style::accent(format!("oui-hub:{base}"))
        ));
    }
    if !missing.is_empty() {
        let list: Vec<String> = missing.iter().map(|(n, v)| format!("{n}@{v}")).collect();
        style::out(style::warn(format!(
            "声明缓存缺失（{}）；运行 {} 重建",
            list.join("、"),
            style::accent("oui fix")
        )));
    }
    // 有声明缓存就接（tsconfig paths 指向缓存入口）；无类型时保持通配 any
    if with_types || !type_paths_of(&root, &lock).is_empty() {
        report_types(&configure_types(&root));
    } else if !has_remote_types(&root) {
        style::out(format!(
            "{} {} 并更新 tsconfig",
            style::ok("已登记"),
            style::strong(format!("{base}@{version}"))
        ));
    }
    style::out(format!(
        "{}安装 @openui_hub/plugin_vite 并在 vite.config 添加 {}；代码中 {} 或 {} from 'oui-hub:{}'",
        style::strong("构建期接入："),
        style::accent("hubVite()"),
        style::accent("import { Button }"),
        style::accent("import desc"),
        style::accent(&base)
    ));
    Ok(())
}

/// source 模式：把包的源码文件复制到 <cwd>/src/components/oui/<slug>/（按 basename 平铺）。
pub(crate) async fn cmd_use_source(pkg: &str, registry: &Option<String>) -> Result<()> {
    let (base, want_version) = split_pkg_spec(pkg)?;
    let reg = resolve_or_prompt_registry(registry.as_deref(), "从哪个 hub 获取该组件")?;
    let client = reqwest::Client::new();

    // 版本：显式给了就直取该版本 manifest，否则取 latest 再取该版本 manifest
    let version = match &want_version {
        Some(v) => v.clone(),
        None => {
            let body = fetch_latest(&client, &reg, &base).await?;
            body["version"].as_str().unwrap_or_default().to_string()
        }
    };
    if version.is_empty() {
        bail!("hub 响应缺少 version: {base}");
    }

    // manifest → source.files
    let m = fetch_manifest(&client, &reg, &base, &version).await?;
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

    style::out(format!("{} {copied} 个源文件到 {}", style::ok("已复制"), style::muted(target.display())));
    style::out(format!(
        "{} 源码已落盘（{}，不写入 lock）",
        style::strong(format!("{base}@{version}")),
        style::accent("mode=source")
    ));
    if css_strategy != "vanilla" {
        style::out(format!(
            "{}该包 cssStrategy={}，原子类策略需接入工程配置 UnoCSS",
            style::warn("提示："),
            style::accent(&css_strategy)
        ));
    }
    style::out(format!(
        "{}在 src/components/oui/{slug}/index.ts（如有）导出；注意源码为按文件名的平铺布局",
        style::strong("接入：")
    ));
    Ok(())
}
