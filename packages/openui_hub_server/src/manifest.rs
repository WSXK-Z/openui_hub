use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// manifest.json 结构（v1 契约，server 校验的唯一依据）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub name: String,
    pub version: String,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub description: Option<String>,
    pub entry: ManifestEntry,
    #[serde(default, rename = "cssStrategy")]
    pub css_strategy: Option<String>,
    #[serde(default)]
    pub peer: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestEntry {
    pub module: String,
    #[serde(default)]
    pub css: Vec<String>,
    /// 类型声明入口（相对包根，如 types/button.d.ts，与 dist/ 同级）；缺省＝该包不提供类型
    #[serde(default)]
    pub types: Option<String>,
    /// 声明文件清单（相对包根），供使用方落盘精确类型
    #[serde(default, rename = "typesFiles")]
    pub types_files: Vec<String>,
}

/// 反序列化 + 结构校验。错误信息面向 CLI 使用方（作为 400 error 返回）。
pub fn parse_and_validate(bytes: &[u8]) -> Result<Manifest, String> {
    let m: Manifest =
        serde_json::from_slice(bytes).map_err(|e| format!("invalid manifest.json: {e}"))?;

    // name 必须形如 @scope/name（scope 以 @ 开头，name 不含 @，均非空）
    let (scope, name) = m
        .name
        .split_once('/')
        .ok_or_else(|| "invalid manifest name: expected @scope/name".to_string())?;
    if !scope.starts_with('@') || scope.len() <= 1 || name.is_empty() || name.contains('@') {
        return Err("invalid manifest name: expected @scope/name".into());
    }

    // version 必须合法 semver
    semver::Version::parse(&m.version)
        .map_err(|e| format!("invalid manifest version: {e}"))?;

    // v1 仅支持 vue-component
    if m.kind != "vue-component" {
        return Err("unsupported manifest type (only vue-component)".into());
    }

    // entry.module / entry.css 的路径安全（相对、无 ..）由归档层保证；
    // 这里只要求非空且存在于归档文件清单（由调用方传入 files）。
    Ok(m)
}

/// 校验 entry 引用的每个文件都在归档清单中。files 键为归档内相对路径（正斜杠）。
pub fn check_entry_files(m: &Manifest, files: &BTreeMap<String, Vec<u8>>) -> Result<(), String> {
    let mut refs = vec![m.entry.module.clone()];
    refs.extend(m.entry.css.iter().cloned());
    if let Some(t) = &m.entry.types {
        refs.push(t.clone());
    }
    refs.extend(m.entry.types_files.iter().cloned());
    for rel in &refs {
        if rel.is_empty() || rel.starts_with('/') || rel.split('/').any(|s| s == "..") {
            return Err(format!("unsafe entry path in manifest: {rel}"));
        }
        if !files.contains_key(rel) {
            return Err(format!("entry file not in archive: {rel}"));
        }
    }
    Ok(())
}
