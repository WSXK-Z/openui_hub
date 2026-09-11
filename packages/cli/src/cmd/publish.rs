//! `oui publish`：把组件包（manifest + dist）打包上传到 hub。

use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, bail, Context, Result};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::config::{
    component_pkg_dir, project_root, read_components, read_defaults, PkgConfigFile, COMPONENTS_FILE,
    PKG_CONFIG,
};
use crate::cred::{resolve_publish_token, resolve_registry};

#[derive(Deserialize)]
pub(crate) struct PkgManifest {
    name: String,
    version: String,
    entry: PkgEntry,
    #[serde(default)]
    source: Option<PkgSource>,
}

#[derive(Deserialize)]
pub(crate) struct PkgSource {
    #[serde(default)]
    files: Vec<String>,
}

#[derive(Deserialize)]
pub(crate) struct PkgEntry {
    module: String,
    #[serde(default)]
    css: Vec<String>,
    #[serde(default)]
    types: Option<String>,
    #[serde(default, rename = "typesFiles")]
    types_files: Vec<String>,
}

/// 上传单个包目录（含 manifest.json 的产物包，即 hubPackage 生成的 <outDir>/<pkg>）。
/// allow_exists=true（项目模式）：409 已存在 → 打印跳过并 Ok；其余错误照常失败。
pub(crate) async fn upload_pkg(pkg_root: &Path, registry: &str, token: &str, allow_exists: bool) -> Result<()> {
    let manifest_path = pkg_root.join("manifest.json");
    if !manifest_path.is_file() {
        bail!(
            "缺少 {}（先构建：vite build（hubPackage 会生成各组件 dist+manifest））",
            manifest_path.display()
        );
    }
    let raw = fs::read(&manifest_path)
        .with_context(|| format!("读取 manifest 失败: {}", manifest_path.display()))?;
    let m: PkgManifest = serde_json::from_slice(&raw)
        .with_context(|| format!("manifest.json 解析失败: {}", manifest_path.display()))?;

    // 固定清单：manifest.json + entry.module + entry.css + entry.types(+typesFiles) + manifest.source.files（不扫描整目录）
    let mut files: Vec<(String, PathBuf)> = vec![("manifest.json".into(), manifest_path)];
    for rel in std::iter::once(&m.entry.module)
        .chain(m.entry.css.iter())
        .chain(m.entry.types.iter())
        .chain(m.entry.types_files.iter())
    {
        files.push((rel.clone(), pkg_root.join(rel)));
    }
    if let Some(src) = &m.source {
        for rel in &src.files {
            files.push((rel.clone(), pkg_root.join(rel)));
        }
    }
    for (rel, path) in &files {
        if !path.is_file() {
            bail!("包内缺少清单文件: {rel}");
        }
    }

    let archive = build_tar_gz(&files)?;
    let url = format!("{}/api/publish", registry.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .bearer_auth(token)
        .header("content-type", "application/octet-stream")
        .body(archive)
        .send()
        .await
        .with_context(|| format!("请求 hub 失败: {url}"))?;
    let status = resp.status();
    let body: Value = resp
        .json()
        .await
        .unwrap_or_else(|_| json!({ "error": "无法解析响应" }));
    if status.is_success() {
        let manifest_url = body["manifestUrl"].as_str().unwrap_or("-");
        println!("published {}@{} -> {manifest_url}", m.name, m.version);
        Ok(())
    } else if allow_exists && status == reqwest::StatusCode::CONFLICT {
        println!("skipped {}@{}", m.name, m.version);
        Ok(())
    } else {
        let msg = body["error"].as_str().unwrap_or("unknown error");
        bail!("{msg}");
    }
}

/// publish：
///   --dir <d> —— d 为单个包目录（含 manifest.json）；或 d 为工程根（oui.json）；
///   无 --dir —— cwd：单个包目录（manifest.json）或工程根（oui.json）。
/// 工程根模式：发布 oui.components.json 清单中（构建过）的所有组件，各发到自己的 hub 地址。
pub(crate) async fn cmd_publish(dir_flag: Option<&str>, registry: &Option<String>, token: &Option<String>) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let probe = |b: &PathBuf| -> (bool, Option<PkgConfigFile>) {
        (b.join("manifest.json").is_file(), read_defaults(b))
    };

    enum Target {
        Single(PathBuf),
        Project { root: PathBuf, defaults: Option<PkgConfigFile> },
    }
    let target = match dir_flag {
        Some(d) => {
            let b = PathBuf::from(d);
            let (is_single, defaults) = probe(&b);
            if is_single {
                Target::Single(b)
            } else if defaults.is_some() {
                Target::Project { root: b, defaults }
            } else {
                match project_root(&b) {
                    (root, Some(defaults)) if root != b => Target::Project { root, defaults: Some(defaults) },
                    _ => bail!("{d} 既没有 manifest.json，也不是含 {PKG_CONFIG} 的工程根"),
                }
            }
        }
        None => {
            let (is_single, _) = probe(&cwd);
            if is_single {
                Target::Single(cwd)
            } else {
                match project_root(&cwd) {
                    (root, Some(defaults)) => Target::Project { root, defaults: Some(defaults) },
                    (_, None) => bail!("当前目录及上级均无 {PKG_CONFIG}，也没有 manifest.json——先 oui register 登记组件，或用 oui publish --dir <pkg 目录>"),
                }
            }
        }
    };

    match target {
        Target::Single(root) => {
            let reg = resolve_registry(registry);
            let tk = resolve_publish_token(token, &reg)
                .ok_or_else(|| anyhow!("缺少发布令牌：请用 --token 或环境变量 OUI_TOKEN"))?;
            upload_pkg(&root, &reg, &tk, false).await
        }
        Target::Project { root, defaults } => {
            let components = read_components(&root);
            if components.is_empty() {
                bail!("{COMPONENTS_FILE} 的 components 为空；请先用 `oui register` 登记组件")
            }
            let fallback = defaults.unwrap_or(PkgConfigFile::default());
            for c in &components {
                // 组件各自指定 hub 地址；--registry 可临时覆盖
                let reg = resolve_registry(&registry.clone().or_else(|| c.registry.clone()));
                let tk = resolve_publish_token(token, &reg)
                    .ok_or_else(|| anyhow!("{} 缺少发布令牌：请用 --token、OUI_TOKEN 或 `oui hub add --registry {reg}`", c.name))?;
                let pkg_root = component_pkg_dir(&fallback, c);
                let abs = if pkg_root.is_absolute() { pkg_root } else { root.join(&pkg_root) };
                println!("[oui] 发布组件 {}@{} → {}（{}）", c.name, c.version, reg, abs.display());
                upload_pkg(&abs, &reg, &tk, true).await?;
            }
            Ok(())
        }
    }
}

pub(crate) fn build_tar_gz(files: &[(String, PathBuf)]) -> Result<Vec<u8>> {
    let mut enc = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    {
        let mut b = tar::Builder::new(&mut enc);
        for (rel, path) in files {
            let data = fs::read(path)
                .with_context(|| format!("读取失败: {}", path.display()))?;
            let mut h = tar::Header::new_gnu();
            h.set_size(data.len() as u64);
            h.set_mode(0o644);
            h.set_cksum();
            b.append_data(&mut h, rel, &data[..])
                .with_context(|| format!("归档失败: {rel}"))?;
        }
        b.finish()?;
    }
    enc.finish().map_err(Into::into)
}
