//! `oui manifest`：为构建产物目录生成/更新 manifest.json（publish 的前置）。

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManifestOut {
    name: String,
    version: String,
    #[serde(rename = "type")]
    kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    entry: ManifestOutEntry,
    #[serde(rename = "cssStrategy", skip_serializing_if = "Option::is_none")]
    css_strategy: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    peer: Option<BTreeMap<String, String>>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManifestOutEntry {
    module: String,
    css: Vec<String>,
}

/// 列出目录下指定扩展名的文件名（按名称排序）。
pub(crate) fn list_dir_ext(dir: &std::path::Path, ext: &str) -> Result<Vec<String>> {
    if !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for e in fs::read_dir(dir)? {
        let e = e?;
        let p = e.path();
        if p.is_file() && p.extension().and_then(|x| x.to_str()) == Some(ext) {
            out.push(e.file_name().to_string_lossy().into_owned());
        }
    }
    out.sort();
    Ok(out)
}

pub(crate) fn cmd_manifest(
    dir: &str,
    name_flag: Option<&str>,
    version_flag: Option<&str>,
    description_flag: Option<&str>,
    kind_flag: &Option<String>,
    css_strategy_flag: &Option<String>,
    module_flag: Option<&str>,
    css_flags: &[String],
    peer_flags: &[String],
) -> Result<()> {
    let root = PathBuf::from(dir);
    let manifest_path = root.join("manifest.json");

    // 已有 manifest 作为 base（name/version/description/cssStrategy/peer 的继承来源）
    let base: Option<ManifestOut> = if manifest_path.is_file() {
        serde_json::from_slice(&fs::read(&manifest_path)?).ok()
    } else {
        None
    };

    let name = match name_flag {
        Some(n) => n.to_string(),
        None => base
            .as_ref()
            .map(|b| b.name.clone())
            .ok_or_else(|| anyhow!("缺少包名：请用 --name <@scope/name>"))?,
    };
    if !name.starts_with('@') || !name.contains('/') {
        bail!("包名格式错误（应为 @scope/name）: {name}");
    }
    let version = match version_flag {
        Some(v) => v.to_string(),
        None => base
            .as_ref()
            .map(|b| b.version.clone())
            .ok_or_else(|| anyhow!("缺少版本：请用 --version <x.y.z>"))?,
    };
    if version.is_empty() {
        bail!("版本不能为空");
    }
    let kind = kind_flag
        .clone()
        .or_else(|| base.as_ref().map(|b| b.kind.clone()))
        .unwrap_or_else(|| "vue-component".to_string());
    let description = description_flag.map(String::from).or_else(|| base.as_ref().and_then(|b| b.description.clone()));
    let css_strategy = css_strategy_flag
        .clone()
        .or_else(|| base.as_ref().and_then(|b| b.css_strategy.clone()))
        .unwrap_or_else(|| "vanilla".to_string());

    let (module_rel, css_rels) = resolve_entry(&root, module_flag, css_flags)?;

    // peer：有 --peer 时全量覆盖；否则继承 base
    let peer = if peer_flags.is_empty() {
        base.as_ref().and_then(|b| b.peer.clone())
    } else {
        let mut m = BTreeMap::new();
        for kv in peer_flags {
            let (k, v) = kv
                .split_once(':')
                .ok_or_else(|| anyhow!("--peer 格式应为 k:v，实际: {kv}"))?;
            m.insert(k.to_string(), v.to_string());
        }
        Some(m)
    };

    let out = ManifestOut {
        name: name.clone(),
        version: version.clone(),
        kind,
        description,
        entry: ManifestOutEntry { module: module_rel, css: css_rels },
        css_strategy: Some(css_strategy),
        peer: peer.filter(|p| !p.is_empty()),
    };
    let text = format!("{}\n", serde_json::to_string_pretty(&out)?);
    fs::write(&manifest_path, text)?;

    println!("manifest 已写入 {}", manifest_path.display());
    println!("{name}@{version} entry={}", out.entry.module);
    println!("发布：oui publish --dir {dir} --registry <hub> --token <token>");
    Ok(())
}

/// 解析 entry：module 用 flag 或推断（root/dist 下唯一 .mjs → .js）；css 用 flag 或扫描 dist/*.css。
/// 引用的文件必须真实存在（publish 按固定清单打包，缺文件会导致 server 拒绝）。
pub(crate) fn resolve_entry(
    root: &Path,
    module_flag: Option<&str>,
    css_flags: &[String],
) -> Result<(String, Vec<String>)> {
    let dist_dir = root.join("dist");
    let module_rel = match module_flag {
        Some(m) => m.to_string(),
        None => {
            let mut cands: Vec<String> = list_dir_ext(&dist_dir, "mjs")?
                .into_iter()
                .map(|f| format!("dist/{f}"))
                .collect();
            if cands.len() == 1 {
                cands.remove(0)
            } else {
                let js: Vec<String> = list_dir_ext(&dist_dir, "js")?
                    .into_iter()
                    .map(|f| format!("dist/{f}"))
                    .collect();
                if js.len() == 1 {
                    js.into_iter().next().unwrap()
                } else {
                    bail!("无法推断 ESM 入口（dist 下 .mjs/.js 数量非 1，实际 {} .mjs / {} .js）——请用 --module <rel> 指定", cands.len(), js.len());
                }
            }
        }
    };
    let css_rels: Vec<String> = if !css_flags.is_empty() {
        css_flags.to_vec()
    } else {
        list_dir_ext(&dist_dir, "css")?
            .into_iter()
            .map(|f| format!("dist/{f}"))
            .collect()
    };
    for rel in std::iter::once(&module_rel).chain(css_rels.iter()) {
        if !root.join(rel).is_file() {
            bail!("清单引用的文件不存在: {rel}");
        }
    }
    Ok((module_rel, css_rels))
}
