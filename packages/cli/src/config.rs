//! 工程配置文件：`oui.json`（CLI 配置与公共默认值）、`oui.components.json`（组件清单）、
//! `oui.lock.json`（使用锁定）的模型、读写与校验。

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, bail, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::style;

/// 使用依赖锁定的文件名（组件使用者）。
pub(crate) const LOCK_FILE: &str = "oui.lock.json";
/// 远程组件声明缓存（工程根下）：`<pkg>/index.d.ts` 转发 `<pkg>/<version>/**` 的声明文件。
/// 与构建期模块缓存同根（`node_modules/.hub-cache`），工程目录因此不产生额外文件、无需忽略配置；
/// 映射值不随版本变化，故 tsconfig 的 paths 只需插入、无需改写（用户 tsconfig 里的 JSONC 原样保留）。
pub(crate) const TYPES_DIR: &str = "node_modules/.hub-cache/types";

pub(crate) const PKG_CONFIG: &str = "oui.json";
/// 纳入 hub 的组件清单（组件开发者）。
pub(crate) const COMPONENTS_FILE: &str = "oui.components.json";
pub(crate) const PKG_SCHEMA: &str = "node_modules/@openui_hub/cli/oui.schema.json";
/// 组件清单（`oui.components.json`）与使用锁定（`oui.lock.json`）的 schema。
pub(crate) const COMPONENTS_SCHEMA: &str = "node_modules/@openui_hub/cli/oui.components.schema.json";
pub(crate) const LOCK_SCHEMA: &str = "node_modules/@openui_hub/cli/oui.lock.schema.json";
pub(crate) const DEFAULT_REGISTRY: &str = "http://127.0.0.1:8787";

/// 本 CLI 提供的 schema 文件名。
const OWN_SCHEMAS: [&str; 3] = ["oui.schema.json", "oui.components.schema.json", "oui.lock.schema.json"];

/// 既有 `$schema` 是否指向本 CLI 的某个 schema 文件（含 `../../node_modules/…` 等旧相对路径）。
fn is_own_schema(v: &str) -> bool {
    OWN_SCHEMAS.contains(&v.rsplit(['/', '\\']).next().unwrap_or(v))
}

/// `$schema` 需改写时的新值：缺失或指向本 CLI 的其它 schema（含旧相对路径）→ 当前路径；
/// 已是当前值、指向远程/自定义 schema → 不改。
fn schema_patch(current: Option<&str>, canonical: &str) -> Option<String> {
    match current {
        None => Some(canonical.to_string()),
        Some(c) if c == canonical => None,
        Some(c) if c.starts_with("http://") || c.starts_with("https://") => None,
        Some(c) if is_own_schema(c) => Some(canonical.to_string()),
        Some(_) => None,
    }
}

/// `oui.json`：CLI 在当前目录的配置与公共默认值。
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PkgConfigFile {
    #[serde(default, rename = "type")]
    pub(crate) kind: Option<String>,
    #[serde(default)]
    pub(crate) css_strategy: Option<String>,
    /// 包输出根目录（默认 pkg）
    #[serde(default)]
    pub(crate) out_dir: Option<String>,
    /// 组件源码是否使用 UnoCSS 原子类（hubPackage 读取）
    #[serde(default)]
    pub(crate) uno: Option<bool>,
    #[serde(default)]
    pub(crate) peer: Option<BTreeMap<String, String>>,
    /// 使用者锁文件名（默认 `oui.lock.json`）
    #[serde(default)]
    pub(crate) lock_file: Option<String>,
}

/// `oui.components.json`：纳入 hub 的组件清单（组件开发者）。
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ComponentsFile {
    #[serde(default)]
    components: Vec<PkgComponent>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PkgComponent {
    pub(crate) name: String,
    pub(crate) version: String,
    /// 该组件发布到的 hub 地址（`oui register` 询问后写入）
    #[serde(default)]
    pub(crate) registry: Option<String>,
    #[serde(default)]
    pub(crate) description: Option<String>,
    #[serde(default)]
    pub(crate) out_dir: Option<String>,
    #[serde(default)]
    pub(crate) entry: Option<String>,
    /// 随包分发的源码清单（hubPackage 写入 manifest.source）；缺省 [entry]
    #[serde(default)]
    pub(crate) source: Option<Vec<String>>,
    /// 类型声明：字符串＝显式入口（相对工程根；hubPackage 复制其所在目录到包内 types/，与 dist/ 同级）；
    /// false＝显式不提供（消费端 any）；缺省＝由 hubPackage 按 tsconfig.oui.json 自动推导；
    /// 其它取值（true/对象）＝未关闭，按缺省处理。
    #[serde(default)]
    pub(crate) types: Option<Value>,
}

/// 该组件的 types 是否显式关闭（JSON false）。其它取值（字符串/true/对象）＝未关闭，
/// 由 hubPackage 按约定自动推导或按显式路径处理。
pub(crate) fn types_disabled(v: &Value) -> bool {
    v.as_bool() == Some(false)
}

impl PkgConfigFile {
    pub(crate) fn out_root(&self) -> String {
        self.out_dir.clone().unwrap_or_else(|| "pkg".to_string())
    }

    /// 使用者锁文件名（默认 `oui.lock.json`）。
    pub(crate) fn lock_file_name(&self) -> String {
        self.lock_file.clone().unwrap_or_else(|| LOCK_FILE.to_string())
    }
}

/// 组件包目录：条目 outDir（相对工程根）或 <默认 outDir>/<name>@<version>（含 scope）。
pub(crate) fn component_pkg_dir(defaults: &PkgConfigFile, c: &PkgComponent) -> PathBuf {
    if let Some(o) = &c.out_dir {
        PathBuf::from(o)
    } else {
        PathBuf::from(defaults.out_root()).join(format!("{}@{}", c.name, c.version))
    }
}

/// 读取 JSON 文件（缺失/畸形 → None）。
pub(crate) fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    serde_json::from_slice(&fs::read(path).ok()?).ok()
}

/// 工程默认配置（`oui.json`）。
pub(crate) fn read_defaults(root: &Path) -> Option<PkgConfigFile> {
    read_json(&root.join(PKG_CONFIG))
}

/// 组件清单（`oui.components.json`）。
pub(crate) fn read_components(root: &Path) -> Vec<PkgComponent> {
    read_json::<ComponentsFile>(&root.join(COMPONENTS_FILE))
        .map(|c| c.components)
        .unwrap_or_default()
}

/// 读取同目录 package.json 的 version/peerDependencies（用于继承）。
pub(crate) fn read_package_json(dir: &std::path::Path) -> Option<(String, BTreeMap<String, String>)> {
    let p = dir.join("package.json");
    let v: Value = serde_json::from_slice(&fs::read(p).ok()?).ok()?;
    let version = v.get("version")?.as_str()?.to_string();
    let mut peer = BTreeMap::new();
    if let Some(map) = v.get("peerDependencies").and_then(|m| m.as_object()) {
        for (k, val) in map {
            if let Some(s) = val.as_str() {
                peer.insert(k.clone(), s.to_string());
            }
        }
    }
    Some((version, peer))
}

/// 读既有 JSON 对象（缺失 → 空对象；畸形或非对象 → 报错，避免覆盖已有配置）。
pub(crate) fn read_json_object(path: &Path) -> Result<Value> {
    let doc: Value = if path.is_file() {
        serde_json::from_slice(&fs::read(path)?)
            .with_context(|| format!("{} 解析失败；请先修正，避免覆盖已有配置", path.display()))?
    } else {
        json!({})
    };
    if !doc.is_object() {
        bail!("{} 顶层应为 JSON 对象", path.display());
    }
    Ok(doc)
}

/// `oui init` 写盘用的最终配置。
pub(crate) struct InitOut {
    pub(crate) kind: String,
    pub(crate) css_strategy: String,
    pub(crate) out_dir: String,
    pub(crate) uno: bool,
    pub(crate) lock_file: String,
    pub(crate) peer: BTreeMap<String, String>,
}

/// `oui.json` 内容：`$schema` + 公共默认段，其余键原样保留。
pub(crate) fn merged_defaults_value(path: &Path, o: &InitOut) -> Result<Value> {
    let mut doc = read_json_object(path)?;
    let obj = doc.as_object_mut().unwrap();
    if let Some(s) = schema_patch(obj.get("$schema").and_then(Value::as_str), PKG_SCHEMA) {
        obj.insert("$schema".into(), json!(s));
    }

    obj.insert("type".into(), json!(o.kind));
    obj.insert("cssStrategy".into(), json!(o.css_strategy));
    if o.out_dir == "pkg" {
        obj.remove("outDir");
    } else {
        obj.insert("outDir".into(), json!(o.out_dir));
    }
    if o.uno {
        obj.insert("uno".into(), json!(true));
    } else {
        obj.remove("uno");
    }
    if o.peer.is_empty() {
        obj.remove("peer");
    } else {
        let m: serde_json::Map<String, Value> =
            o.peer.iter().map(|(k, v)| (k.clone(), json!(v))).collect();
        obj.insert("peer".into(), Value::Object(m));
    }
    if o.lock_file == LOCK_FILE {
        obj.remove("lockFile");
    } else {
        obj.insert("lockFile".into(), json!(o.lock_file));
    }
    Ok(doc)
}

/// 写工程默认配置：`oui.json`（组件清单与使用锁定各在自己的文件里）。
pub(crate) fn write_pkg_config(path: &Path, o: &InitOut) -> Result<()> {
    let doc = merged_defaults_value(path, o)?;
    fs::write(path, format!("{}\n", serde_json::to_string_pretty(&doc)?))
        .with_context(|| format!("写入失败: {}", path.display()))?;
    style::out(format!("{} {}", style::ok("已写入"), style::muted(path.display())));
    if read_components(path.parent().unwrap_or(path)).is_empty() {
        style::out(format!(
            "{}用 {} 登记",
            style::strong("尚未登记组件："),
            style::accent("oui register <@scope/name> --version x.y.z --entry src/…")
        ));
    } else {
        style::out(format!(
            "{}vite build → {}",
            style::strong("下一步："),
            style::accent("oui publish")
        ));
    }
    Ok(())
}

/// `@scope/name` 粗校验。
pub(crate) fn is_scoped_name(name: &str) -> bool {
    name.starts_with('@')
        && name
            .split_once('/')
            .is_some_and(|(scope, pkg)| scope.len() > 1 && !pkg.is_empty())
        && !name.chars().any(char::is_whitespace)
}

/// `x.y.z` 粗校验。
pub(crate) fn is_version(v: &str) -> bool {
    let parts: Vec<&str> = v.split('.').collect();
    parts.len() == 3 && parts.iter().all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
}

/// 展开逗号分隔的列表（去空白、去重）。
pub(crate) fn split_list(items: &[String]) -> Vec<String> {
    items
        .iter()
        .flat_map(|s| s.split(','))
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// 把组件条目保真 upsert 进 `oui.components.json`（`patch` 的键合并进同名既有条目，
/// 值为 null 表示清除该键；条目不存在则新增），保留其它条目与未知字段，返回 components 总数。
pub(crate) fn upsert_component(root: &Path, name: &str, patch: serde_json::Map<String, Value>) -> Result<usize> {
    let path = root.join(COMPONENTS_FILE);
    let mut doc = read_json_object(&path)?;
    let obj = doc
        .as_object_mut()
        .ok_or_else(|| anyhow!("{} 顶层应为 JSON 对象", path.display()))?;
    if let Some(s) = schema_patch(obj.get("$schema").and_then(Value::as_str), COMPONENTS_SCHEMA) {
        obj.insert("$schema".into(), json!(s));
    }
    let arr = obj
        .entry("components".to_string())
        .or_insert_with(|| json!([]))
        .as_array_mut()
        .ok_or_else(|| anyhow!("{} 的 components 应为数组", path.display()))?;

    let pos = arr.iter().position(|c| c.get("name").and_then(Value::as_str) == Some(name));
    let mut m = match pos {
        Some(i) => arr[i].as_object().cloned().unwrap_or_default(),
        None => serde_json::Map::new(),
    };
    m.insert("name".into(), json!(name));
    for (k, v) in patch {
        if v.is_null() {
            m.remove(&k);
        } else {
            m.insert(k, v);
        }
    }
    match pos {
        Some(i) => arr[i] = Value::Object(m),
        None => arr.push(Value::Object(m)),
    }
    let count = arr.len();
    fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&doc)?))
        .with_context(|| format!("写入失败: {}", path.display()))?;
    Ok(count)
}

/// 工程根（所有 components/uses 路径的基准）：
/// 1) 从 `from` 向上找首个含 `oui.json` 的目录；
/// 2) 否则找首个含 `package.json` 的目录（工程根通常在项目清单处）；
/// 3) 都没有 → `from` 自身。
pub(crate) fn project_root(from: &Path) -> (PathBuf, Option<PkgConfigFile>) {
    let mut dir: Option<&Path> = Some(from);
    let mut pkg_fallback: Option<PathBuf> = None;
    while let Some(d) = dir {
        if let Some(cfg) = read_defaults(d) {
            return (d.to_path_buf(), Some(cfg));
        }
        if pkg_fallback.is_none() && d.join("package.json").is_file() {
            pkg_fallback = Some(d.to_path_buf());
        }
        dir = d.parent();
    }
    (pkg_fallback.unwrap_or_else(|| from.to_path_buf()), None)
}

/// `oui.lock.json`：使用依赖锁定。每个包可锁多个版本，`default` 是不带版本号的导入
/// （`oui-hub:@scope/name`）解析到的版本；每条版本只记来源 hub 地址，产物路径/样式/类型
/// 由该版本的 manifest 决定。
#[derive(Deserialize, Serialize, Default)]
pub(crate) struct LockFile {
    #[serde(rename = "$schema", default, skip_serializing_if = "Option::is_none")]
    schema: Option<String>,
    #[serde(default)]
    pub(crate) packages: BTreeMap<String, LockPackage>,
}

#[derive(Deserialize, Serialize, Default)]
pub(crate) struct LockPackage {
    /// 不带版本号的导入解析到的版本
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) default: Option<String>,
    #[serde(default)]
    pub(crate) versions: BTreeMap<String, LockVersion>,
}

#[derive(Deserialize, Serialize, Default)]
pub(crate) struct LockVersion {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) registry: Option<String>,
}

impl LockFile {
    /// 读工程根的 lock（文件名取 oui.json 的 lockFile，缺省 oui.lock.json；缺失/畸形 → 空）。
    pub(crate) fn read(root: &Path) -> LockFile {
        fs::read(root.join(lock_file_name(root)))
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .unwrap_or_default()
    }

    /// 写回 lock（`$schema` 缺失或指向本 CLI 的其它 schema 时写当前路径），返回写入的文件路径。
    pub(crate) fn write(&mut self, root: &Path) -> Result<PathBuf> {
        let path = root.join(lock_file_name(root));
        if let Some(s) = schema_patch(self.schema.as_deref(), LOCK_SCHEMA) {
            self.schema = Some(s);
        }
        fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&*self)?))
            .with_context(|| format!("写入失败: {}", path.display()))?;
        Ok(path)
    }

    /// 已锁定的 (包名, 版本, hub 地址) 清单（按包名/版本排序）。
    pub(crate) fn entries(&self) -> Vec<(&str, &str, Option<&str>)> {
        let mut out = Vec::new();
        for (name, pkg) in &self.packages {
            for (version, v) in &pkg.versions {
                out.push((name.as_str(), version.as_str(), v.registry.as_deref()));
            }
        }
        out
    }
}

/// lock 文件名（oui.json 的 lockFile，缺省 `oui.lock.json`）。
pub(crate) fn lock_file_name(root: &Path) -> String {
    read_defaults(root)
        .map(|c| c.lock_file_name())
        .unwrap_or_else(|| LOCK_FILE.to_string())
}
