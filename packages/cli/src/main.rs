//! oui —— openui_hub 本地终端工具（发布端 + 消费端）。

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, bail, Context, Result};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const LOCK_FILE: &str = "oui-hub.lock.json";
/// 消费端本地类型目录（工程根下）：`<pkg>/index.d.ts` 转发 `<pkg>/<version>/**` 的声明文件。
/// 映射值不随版本变化，故 tsconfig 的 paths 只需插入、无需改写（用户 tsconfig 里的 JSONC 原样保留）。
const TYPES_DIR: &str = "oui-types";
/// 组件工程产出类型声明的独立 tsconfig（只出 .d.ts，JS 由 vite 负责）。
const DTS_TSCONFIG: &str = "tsconfig.dts.json";

#[derive(Parser)]
#[command(name = "oui", version, about = "openui_hub 组件分发工具（发布端 + 消费端）")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// 管理 hub 连接（add / delete / list）
    Hub {
        #[command(subcommand)]
        cmd: HubCmd,
    },
    /// 发布组件包目录（含 manifest.json + dist/，打包为 tar.gz 上传）
    Publish {
        /// 组件包目录（省略时用 cwd 的 oui.json 定位）
        #[arg(long)]
        dir: Option<String>,
        /// hub 地址（flag > env OUI_REGISTRY > connection registry（向上查找）> 默认 127.0.0.1:8787）
        #[arg(long)]
        registry: Option<String>,
        /// 发布令牌（优先于 env OUI_TOKEN）
        #[arg(long)]
        token: Option<String>,
    },
    /// 解析并锁定组件版本，写入 oui.json 的 lockFile（默认 oui-hub.lock.json）
    Use {
        /// 包名，形如 @scope/name 或 @scope/name@version
        pkg: String,
        #[arg(long)]
        registry: Option<String>,
        /// 接入模式：remote（默认，锁定 dist 产物）| source（复制源码到 src/components/oui/）
        #[arg(long, default_value = "remote")]
        mode: String,
        /// 额外接入远程组件类型：在工程根建 oui.d.ts 并登记进 tsconfig（等同 init 的类型选项）
        #[arg(long)]
        with_types: bool,
    },
    /// 列出 hub 上的包
    List {
        #[arg(long)]
        registry: Option<String>,
    },
    /// 为构建产物目录生成/更新 manifest.json（不绑定构建链；publish 的前置）
    Manifest {
        /// 组件包目录（含 manifest.json 与 dist/）
        #[arg(long)]
        dir: String,
        /// 包名 @scope/name（目录已有 manifest 时可省略）
        #[arg(long)]
        name: Option<String>,
        /// semver 版本（目录已有 manifest 时可省略）
        #[arg(long)]
        version: Option<String>,
        /// 描述（可选）
        #[arg(long)]
        description: Option<String>,
        /// 组件类型，默认 vue-component（可继承已有 manifest）
        #[arg(long)]
        r#type: Option<String>,
        /// css 策略，默认 vanilla（可继承已有 manifest）
        #[arg(long)]
        css_strategy: Option<String>,
        /// ESM 入口相对路径（缺省：dist 下唯一 .mjs/.js）
        #[arg(long)]
        module: Option<String>,
        /// css 相对路径，可重复（缺省：dist 下全部 .css）
        #[arg(long)]
        css: Vec<String>,
        /// peer 依赖 k:v，可重复
        #[arg(long)]
        peer: Vec<String>,
    },
    /// 在当前目录交互式初始化 oui.json（连接需先用 `oui hub add` 创建）；
    /// 同时开启 .vscode file nesting，把 oui.d.ts / oui-hub.lock.json / oui.*.json 折叠进 oui.json
    #[command(after_help = "登记/更新待发布组件用：oui register <@scope/name> --version x.y.z --entry src/…\n使用他人组件用：oui use <@scope/name>")]
    Init {
        /// 包输出根目录（含 <name>@<version>/ 包，name 为 @scope/name），默认 pkg
        #[arg(long)]
        dist: Option<String>,
        /// 组件类型，默认 vue-component
        #[arg(long)]
        r#type: Option<String>,
        /// css 策略，默认 vanilla（vanilla | atomic-unocss | atomic-var）
        #[arg(long)]
        css_strategy: Option<String>,
        /// 已有连接名，可重复（省略时用现有配置或交互选择）
        #[arg(long)]
        connection: Vec<String>,
        /// 启用 UnoCSS 原子类支持（写入顶层 uno；未给时继承现有值）
        #[arg(long)]
        uno: bool,
        /// 使用者锁文件名（写入顶层 lockFile），默认 oui-hub.lock.json
        #[arg(long)]
        lock_file: Option<String>,
        /// 接入远程组件类型：建 oui.d.ts；references 模式加 tsconfig.oui.json 引用，否则登记 include
        #[arg(long)]
        tsconfig: bool,
        /// 跳过确认，直接用默认值写入
        #[arg(long)]
        yes: bool,
    },
    /// 登录：交互式录入 registry/令牌并命名连接（默认 default），凭据存到 ~/.oui/credentials.json
    Login {
        /// 连接名（默认 default）
        #[arg(long)]
        name: Option<String>,
        /// registry 地址（省略则交互询问/沿用已有）
        #[arg(long)]
        registry: Option<String>,
        /// 发布令牌（省略则交互询问/沿用已有）
        #[arg(long)]
        token: Option<String>,
        /// 不进入交互询问（缺项直接报错；供 CI 使用）
        #[arg(long)]
        no_input: bool,
    },
    /// 修复工程：重建缺失的本地类型声明（oui-types/）、对齐 tsconfig/d.ts 类型接入，
    /// 并把 oui 相关文件折叠进 oui.json（VS Code file nesting）
    Fix {
        /// hub 地址（flag > env OUI_REGISTRY > 工程连接/凭据 > 默认）
        #[arg(long)]
        registry: Option<String>,
    },
    /// 登记/更新待发布组件到 oui.json 的 components[]（发布侧；与 use 对称）
    Register {
        /// 组件名，形如 @scope/name
        pkg: String,
        /// 版本 x.y.z（省略则交互式询问/沿用已登记值）
        #[arg(long)]
        version: Option<String>,
        /// 组件源入口（相对工程根），如 src/ui/button/button.ts
        #[arg(long)]
        entry: Option<String>,
        /// 随包分发的源码清单（相对工程根；可重复或用逗号分隔）；省略则构建期默认 [entry]
        #[arg(long)]
        source: Vec<String>,
        /// 组件描述（写入 manifest.description）
        #[arg(long)]
        description: Option<String>,
        /// 组件级类型覆盖（默认继承顶层 type）
        #[arg(long)]
        r#type: Option<String>,
        /// 组件级 css 策略覆盖（默认继承顶层 cssStrategy）
        #[arg(long)]
        css_strategy: Option<String>,
        /// 组件级包输出目录覆盖（默认 <outDir>/<name>@<version>）
        #[arg(long)]
        out_dir: Option<String>,
        /// 组件类型声明：省略＝按 tsconfig.dts.json 自动推导；`false`＝显式关闭（消费端 any）；
        /// `<路径>`＝显式入口（相对工程根，缺失即构建失败）；空串＝清除该字段（回到自动推导）
        #[arg(long)]
        types: Option<String>,
        /// 不进入交互询问（缺项直接报错；供 CI 使用）
        #[arg(long)]
        no_input: bool,
    },
}

#[derive(Subcommand)]
enum HubCmd {
    /// 新增/更新一个 hub 连接（交互式录入 registry 与令牌）
    Add {
        #[arg(long)]
        name: Option<String>,
        #[arg(long)]
        registry: Option<String>,
        #[arg(long)]
        token: Option<String>,
        #[arg(long)]
        no_input: bool,
    },
    /// 删除指定的 hub 连接
    Delete { name: String },
    /// 列出已保存的 hub 连接
    List,
}

const PKG_CONFIG: &str = "oui.json";
const PKG_SCHEMA: &str = "node_modules/@openui_hub/cli/oui.schema.json";
const DEFAULT_REGISTRY: &str = "http://127.0.0.1:8787";

// ---------- 登录凭据（用户级，不进仓库） ----------

/// 系统用户主目录（`USERPROFILE`(Windows) > `HOME`(unix)）。
fn os_home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
}

/// 凭据根目录：`OUI_HOME` > 用户主目录 > `.`。
fn oui_home() -> PathBuf {
    std::env::var_os("OUI_HOME")
        .map(PathBuf::from)
        .or_else(os_home)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// 凭据文件：`<home>/.oui/credentials.json`（含 token，**不要**放进仓库）。
fn cred_path() -> PathBuf {
    oui_home().join(".oui").join("credentials.json")
}

const DEFAULT_CONNECTION: &str = "default";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct CredConnection {
    registry: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    token: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct CredStore {
    /// 默认连接名（`oui login` 未指定名字时使用）
    #[serde(default, skip_serializing_if = "Option::is_none")]
    default: Option<String>,
    #[serde(default)]
    connections: BTreeMap<String, CredConnection>,
}

fn read_cred() -> CredStore {
    fs::read(cred_path())
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

fn write_cred(store: &CredStore) -> Result<()> {
    let path = cred_path();
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).with_context(|| format!("创建目录失败: {}", dir.display()))?;
    }
    fs::write(&path, format!("{}\n", serde_json::to_string_pretty(store)?))
        .with_context(|| format!("写入凭据失败: {}", path.display()))?;
    Ok(())
}

/// 按名取连接；`name=None` 时用凭据文件里的 default。
fn connection_named(name: Option<&str>) -> Option<(String, CredConnection)> {
    let store = read_cred();
    let key = match name {
        Some(n) if !n.is_empty() => n.to_string(),
        _ => store.default.clone()?,
    };
    store.connections.get(&key).map(|c| (key.clone(), c.clone()))
}

/// 工程里声明的连接名（oui.json 的 connection，向上查找）。
fn project_connection_name(from: &Path) -> Option<String> {
    find_pkg_config_up(from)
        .and_then(|(_, cfg)| cfg.first_connection().cloned())
        .filter(|s| !s.is_empty())
}

/// registry 解析：flag > env OUI_REGISTRY > 工程 connection（→ 凭据文件）> 凭据默认连接 > 内置默认。
fn registry_url_from(opt: &Option<String>, base: &Path) -> String {
    opt.clone()
        .or_else(|| std::env::var("OUI_REGISTRY").ok())
        .or_else(|| connection_named(project_connection_name(base).as_deref()).map(|(_, c)| c.registry))
        .unwrap_or_else(|| DEFAULT_REGISTRY.to_string())
}

/// 以 cwd 为工程基准解析 registry。
fn registry_url(opt: &Option<String>) -> String {
    registry_url_from(opt, &std::env::current_dir().unwrap_or_default())
}

#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        eprintln!("{e:#}");
        std::process::exit(1);
    }
}

async fn run() -> Result<()> {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Hub { cmd } => match cmd {
            HubCmd::Add { name, registry, token, no_input } =>
                cmd_hub_add(name.as_deref(), registry.as_deref(), token.as_deref(), no_input),
            HubCmd::Delete { name } => cmd_hub_delete(&name),
            HubCmd::List => cmd_hub_list(),
        },
        Cmd::Publish { dir, registry, token } => cmd_publish(dir.as_deref(), &registry, &token).await,
        Cmd::Use { pkg, registry, mode, with_types } => cmd_use(&pkg, &registry, &mode, with_types).await,
        Cmd::List { registry } => cmd_list(&registry).await,
        Cmd::Fix { registry } => cmd_fix(&registry).await,
        Cmd::Login { name, registry, token, no_input } => {
            cmd_login(name.as_deref(), registry.as_deref(), token.as_deref(), no_input)
        }
        Cmd::Manifest { dir, name, version, description, r#type, css_strategy, module, css, peer } => {
            cmd_manifest(&dir, name.as_deref(), version.as_deref(), description.as_deref(), &r#type, &css_strategy, module.as_deref(), &css, &peer)
        }
        Cmd::Init { dist, r#type, css_strategy, connection, uno, lock_file, tsconfig, yes } => {
            cmd_init(InitArgs {
                dist, kind: r#type, css_strategy, connections: connection,
                uno, lock_file, tsconfig, yes,
            })
        }
        Cmd::Register { pkg, version, entry, source, description, r#type, css_strategy, out_dir, types, no_input } => {
            cmd_register(&pkg, version.as_deref(), entry.as_deref(), &source, description.as_deref(),
                         &r#type, &css_strategy, out_dir.as_deref(), types.as_deref(), no_input)
        }
    }
}

// ---------- manifest（生成/更新） ----------

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestOut {
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
struct ManifestOutEntry {
    module: String,
    css: Vec<String>,
}

/// 列出目录下指定扩展名的文件名（按名称排序）。
fn list_dir_ext(dir: &std::path::Path, ext: &str) -> Result<Vec<String>> {
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

fn cmd_manifest(
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
fn resolve_entry(
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

// ---------- 项目配置（唯一配置文件 oui.json：开发者与使用者共用） ----------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PkgConfigFile {
    /// 使用的 hub 连接名（可多个；`oui init` 写入数组，省略时用凭据中的默认连接）
    #[serde(default)]
    connection: Vec<String>,
    #[serde(default, rename = "type")]
    kind: Option<String>,
    #[serde(default)]
    css_strategy: Option<String>,
    /// 包输出根目录（默认 pkg）
    #[serde(default)]
    out_dir: Option<String>,
    /// 组件源码是否使用 UnoCSS 原子类（hubPackage 读取）
    #[serde(default)]
    uno: Option<bool>,
    #[serde(default)]
    peer: Option<BTreeMap<String, String>>,
    /// 本项目所有组件清单（可省略/为空 = 纯使用者项目）
    #[serde(default)]
    components: Vec<PkgComponent>,
    /// 使用者锁文件名（默认 oui-hub.lock.json）
    #[serde(default)]
    lock_file: Option<String>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PkgComponent {
    name: String,
    version: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    out_dir: Option<String>,
    #[serde(default)]
    entry: Option<String>,
    /// 随包分发的源码清单（hubPackage 写入 manifest.source）；缺省 [entry]
    #[serde(default)]
    source: Option<Vec<String>>,
    /// 类型声明：字符串＝显式入口（相对工程根；hubPackage 复制其所在目录到包内 types/，与 dist/ 同级）；
    /// false＝显式不提供（消费端 any）；缺省＝由 hubPackage 按 tsconfig.dts.json 自动推导；
    /// 其它取值（true/对象）＝未关闭，按缺省处理。
    #[serde(default)]
    types: Option<Value>,
}

/// 该组件的 types 是否显式关闭（JSON false）。其它取值（字符串/true/对象）＝未关闭，
/// 由 hubPackage 按约定自动推导或按显式路径处理。
fn types_disabled(v: &Value) -> bool {
    v.as_bool() == Some(false)
}

impl PkgConfigFile {
    /// 工程声明的首个连接名（空 → 用凭据里的默认连接）。
    fn first_connection(&self) -> Option<&String> {
        self.connection.first()
    }

    fn out_root(&self) -> String {
        self.out_dir.clone().unwrap_or_else(|| "pkg".to_string())
    }

    /// 使用者锁文件名（默认 oui-hub.lock.json）
    fn lock_file_name(&self) -> String {
        self.lock_file.clone().unwrap_or_else(|| LOCK_FILE.to_string())
    }

    /// 由 hubPackage 按约定自动推导或按显式路径处理。
    /// 组件条目 outDir（相对工程根）或 <顶层 outDir>/<name>@<version>（含 scope）。
    fn component_pkg_dir(&self, c: &PkgComponent) -> PathBuf {
        if let Some(o) = &c.out_dir {
            PathBuf::from(o)
        } else {
            PathBuf::from(self.out_root()).join(format!("{}@{}", c.name, c.version))
        }
    }
}

/// 读取包目录 oui.json（畸形/缺失 → None）。
fn read_pkg_config(dir: &std::path::Path) -> Option<PkgConfigFile> {
    let p = dir.join(PKG_CONFIG);
    if p.is_file() {
        return serde_json::from_slice(&fs::read(p).ok()?).ok();
    }
    None
}

/// 读取同目录 package.json 的 version/peerDependencies（用于继承）。
fn read_package_json(dir: &std::path::Path) -> Option<(String, BTreeMap<String, String>)> {
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

/// `oui init` 的参数（参数模式）。未给的项继承现有配置或默认值。
struct InitArgs {
    dist: Option<String>,
    kind: Option<String>,
    css_strategy: Option<String>,
    connections: Vec<String>,
    uno: bool,
    lock_file: Option<String>,
    tsconfig: bool,
    yes: bool,
}

impl InitArgs {
    /// 是否走参数模式：给出任一 flag 即为非交互（`--yes` 单独出现仍进向导）。
    fn is_param_mode(&self) -> bool {
        self.dist.is_some()
            || self.kind.is_some()
            || self.css_strategy.is_some()
            || !self.connections.is_empty()
            || self.uno
            || self.lock_file.is_some()
            || self.tsconfig
    }
}

/// init 写盘用的最终配置。
struct InitOut {
    connection: Vec<String>,
    kind: String,
    css_strategy: String,
    out_dir: String,
    uno: bool,
    lock_file: String,
    peer: BTreeMap<String, String>,
}

/// 在既有原始 JSON 上合并 init 管理的字段（components/uses 及未知键原样保留）。
fn merged_config_value(path: &std::path::Path, o: &InitOut) -> Result<Value> {
    let mut root: Value = if path.is_file() {
        serde_json::from_slice(&fs::read(path)?)
            .with_context(|| format!("{} 解析失败；请先修正，避免覆盖已有配置", path.display()))?
    } else {
        json!({})
    };
    let obj = root
        .as_object_mut()
        .ok_or_else(|| anyhow!("{} 顶层应为 JSON 对象", path.display()))?;
    obj.entry("$schema".to_string())
        .or_insert_with(|| json!(PKG_SCHEMA));

    if !o.connection.is_empty() {
        obj.insert("connection".into(), json!(o.connection));
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
    }
    if !o.peer.is_empty() {
        let m: serde_json::Map<String, Value> =
            o.peer.iter().map(|(k, v)| (k.clone(), json!(v))).collect();
        obj.insert("peer".into(), Value::Object(m));
    }
    if o.lock_file == LOCK_FILE {
        obj.remove("lockFile");
    } else {
        obj.insert("lockFile".into(), json!(o.lock_file));
    }
    Ok(root)
}

fn write_pkg_config(path: &std::path::Path, o: &InitOut) -> Result<()> {
    let merged = merged_config_value(path, o)?;
    let components = merged
        .get("components")
        .and_then(Value::as_array)
        .map_or(0, Vec::len);
    fs::write(path, format!("{}\n", serde_json::to_string_pretty(&merged)?))?;
    for connection in &o.connection {
        // overlay：只声明 extends 与所属连接，不复制工程设置。
        let per = json!({
            "$schema": PKG_SCHEMA,
            "extends": "oui.json",
            "connection": [connection]
        });
        let sibling = path.with_file_name(format!("oui.{connection}.json"));
        fs::write(&sibling, format!("{}\n", serde_json::to_string_pretty(&per)?))?;
    }
    println!("已写入 {}", path.display());
    if components == 0 {
        println!("尚未登记组件：用 oui register <@scope/name> --version x.y.z --entry src/… 登记");
    } else {
        println!("下一步：vite build → oui publish");
    }
    Ok(())
}

/// `@scope/name` 粗校验。
fn is_scoped_name(name: &str) -> bool {
    name.starts_with('@')
        && name
            .split_once('/')
            .is_some_and(|(scope, pkg)| scope.len() > 1 && !pkg.is_empty())
        && !name.chars().any(char::is_whitespace)
}

/// `x.y.z` 粗校验。
fn is_version(v: &str) -> bool {
    let parts: Vec<&str> = v.split('.').collect();
    parts.len() == 3 && parts.iter().all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
}

/// 展开逗号分隔的列表（去空白、去重）。
fn split_list(items: &[String]) -> Vec<String> {
    items
        .iter()
        .flat_map(|s| s.split(','))
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// 使用者登记：把依赖 upsert 进 cwd 的 oui.json `uses[]`（保留文件内其他字段原样）。
/// 无配置文件时创建；文件存在但非法 JSON → 报错不覆盖。
fn register_use(cwd: &std::path::Path, name: &str, version: &str, mode: &str) -> Result<()> {
    let path = cwd.join(PKG_CONFIG);
    let mut root: Value = if path.is_file() {
        serde_json::from_slice(&fs::read(&path)?).with_context(|| {
            format!("{} 解析失败；请先修正，避免覆盖已有配置", path.display())
        })?
    } else {
        json!({})
    };
    let obj = root
        .as_object_mut()
        .ok_or_else(|| anyhow!("{} 顶层应为 JSON 对象", path.display()))?;
    let uses = obj.entry("uses".to_string()).or_insert_with(|| json!([]));
    let arr = uses
        .as_array_mut()
        .ok_or_else(|| anyhow!("{} 的 uses 应为数组", path.display()))?;
    arr.retain(|u| u.get("name").and_then(Value::as_str) != Some(name));
    arr.push(json!({ "name": name, "version": version, "mode": mode }));
    fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&root)?))?;
    Ok(())
}


/// 交互式读取一行（去首尾空白）。stdin 无输入（EOF：非交互/CI）→ 报错。
fn prompt(label: &str, hint: &str) -> Result<String> {
    use std::io::Write;

    if hint.is_empty() {
        print!("{label}: ");
    } else {
        print!("{label} [{hint}]: ");
    }
    std::io::stdout().flush()?;
    let mut line = String::new();
    if std::io::stdin().read_line(&mut line)? == 0 {
        bail!("需要交互输入；CI 场景请用 --no-input");
    }
    Ok(line.trim().to_string())
}

/// 带默认值的输入提示（回车采用 default，输入则覆盖）。
fn prompt_default(label: &str, default: &str) -> Result<String> {
    let v = prompt(label, default)?;
    Ok(if v.is_empty() { default.to_string() } else { v })
}

/// y/N 问答（回车取 default_yes）。
fn prompt_yes(label: &str, default_yes: bool) -> Result<bool> {
    let v = prompt(label, if default_yes { "Y/n" } else { "y/N" })?;
    Ok(if v.is_empty() {
        default_yes
    } else {
        matches!(v.to_ascii_lowercase().as_str(), "y" | "yes")
    })
}

/// oui init：无参数 → 交互式向导；给任一 flag → 参数模式（CI）。
/// 写配置后同步 `.vscode/settings.json` 的 explorer.fileNesting
/// （把 oui.d.ts / oui-hub.lock.json / oui.*.json 折叠进 oui.json）。
fn cmd_init(args: InitArgs) -> Result<()> {
    let cwd = std::env::current_dir()?;
    // 工程根 = 配置所在目录（无配置时取最近的含 package.json 的祖先）
    let (root, existing) = project_root(&cwd);
    let path = root.join(PKG_CONFIG);
    // 文件存在但解析失败 → 拒绝覆写（否则会静默丢掉已有 components/uses 配置）
    if path.is_file() && read_pkg_config(&root).is_none() {
        bail!("{} 存在但解析失败（JSON 畸形或字段类型错误）；请先修正，避免覆盖已有配置", path.display());
    }
    if args.is_param_mode() {
        init_param(args, &root, &path, existing)
    } else {
        init_wizard(args, &path, existing)
    }
}

/// 参数模式：只写公共段（connection / type / cssStrategy / outDir / uno / lockFile）。
/// 组件登记不在此处，使用 `oui register <@scope/name>`。
fn init_param(
    args: InitArgs,
    cwd: &std::path::Path,
    path: &std::path::Path,
    existing: Option<PkgConfigFile>,
) -> Result<()> {
    let peer_from_pkg = read_package_json(cwd).map(|(_, p)| p).unwrap_or_default();
    let ex = existing.as_ref();

    let connection = choose_connections(&args.connections, ex.map(|c| c.connection.clone()))?;
    let kind = args
        .kind
        .or_else(|| ex.and_then(|c| c.kind.clone()))
        .unwrap_or_else(|| "vue-component".to_string());
    let css_strategy = args
        .css_strategy
        .or_else(|| ex.and_then(|c| c.css_strategy.clone()))
        .unwrap_or_else(|| "vanilla".to_string());
    let out_dir = args
        .dist
        .or_else(|| ex.map(PkgConfigFile::out_root))
        .unwrap_or_else(|| "pkg".to_string());
    let lock_file = args
        .lock_file
        .filter(|s| !s.is_empty())
        .or_else(|| ex.and_then(|c| c.lock_file.clone()))
        .unwrap_or_else(|| LOCK_FILE.to_string());
    // --uno 是布尔开关：给了 → true；未给 → 继承现有值
    let uno = args.uno || ex.and_then(|c| c.uno).unwrap_or(false);
    let peer = ex.and_then(|c| c.peer.clone()).unwrap_or(peer_from_pkg);

    write_pkg_config(
        path,
        &InitOut { connection, kind, css_strategy, out_dir, uno, lock_file, peer },
    )?;
    if args.tsconfig {
        report_types(&configure_types(cwd));
    }
    // 同步 .vscode/settings.json 的 explorer.fileNesting（折叠 oui.d.ts / lock / oui.*.json）
    fix_vscode_settings(cwd)
}

/// 交互式向导：逐项问答 + 默认值（回车取默认），保留已有配置，最后确认覆盖。
fn init_wizard(args: InitArgs, path: &std::path::Path, existing: Option<PkgConfigFile>) -> Result<()> {
    let ex = existing.as_ref();
    let cur_conn = ex.map(|c| c.connection.clone()).unwrap_or_default();
    let cur_kind = ex.and_then(|c| c.kind.clone());
    let cur_css = ex.and_then(|c| c.css_strategy.clone());
    let cur_out = ex.and_then(|c| c.out_dir.clone());
    let cur_lock = ex.and_then(|c| c.lock_file.clone());

    // 1. 连接（连接的创建属于 `oui hub add`，此处只选择）
    let available = read_cred().connections.keys().cloned().collect::<Vec<_>>();
    let default = if cur_conn.is_empty() {
        read_cred().default.into_iter().collect()
    } else { cur_conn };
    let hint = if available.is_empty() { "未配置连接，请先运行 oui hub add".to_string() } else { available.join(",") };
    let selected = prompt_default("connection names (comma-separated)", &if default.is_empty() { hint } else { default.join(",") })?;
    let connection = selected.split(',').map(str::trim).filter(|s| !s.is_empty()).map(String::from).collect::<Vec<_>>();
    for name in &connection {
        if !read_cred().connections.contains_key(name) {
            bail!("连接 {name} 不存在，请先运行 `oui hub add --name {name}`");
        }
    }

    // 2. type
    let kind_default = cur_kind.clone().unwrap_or_else(|| "vue-component".to_string());
    let kind = prompt_default("type", &kind_default)?;
    // 3. cssStrategy
    let css_default = cur_css.clone().unwrap_or_else(|| "vanilla".to_string());
    let css_strategy = loop {
        let v = prompt_default("cssStrategy (vanilla | atomic-unocss | atomic-var)", &css_default)?;
        if matches!(v.as_str(), "vanilla" | "atomic-unocss" | "atomic-var") {
            break v;
        }
        eprintln!("cssStrategy 只能是 vanilla | atomic-unocss | atomic-var");
    };
    // 4. outDir
    let out_default = cur_out.clone().unwrap_or_else(|| "pkg".to_string());
    let out_dir = prompt_default("outDir", &out_default)?;
    // 5. uno
    let uno = prompt_yes("启用 UnoCSS 原子类支持？", ex.and_then(|c| c.uno).unwrap_or(false))?;
    // 6. lockFile
    let lock_default = cur_lock.clone().unwrap_or_else(|| LOCK_FILE.to_string());
    let lock_file = prompt_default("lock file", &lock_default)?;
    // 组件登记不在此处：用 `oui register <@scope/name>`（发布侧）与 `oui use <@scope/name>`（使用侧）
    println!("提示：登记待发布组件用 `oui register <@scope/name>`；使用他人组件用 `oui use <@scope/name>`");
    let peer = ex.and_then(|c| c.peer.clone()).unwrap_or_default();
    let out = InitOut {
        connection,
        kind,
        css_strategy,
        out_dir,
        uno,
        lock_file,
        peer,
    };

    // 7. 已有文件 → 打印将写入的 JSON 摘要并确认覆盖（--yes 直接写）
    if path.is_file() && !args.yes {
        println!("将写入 {}", path.display());
        println!("{}", serde_json::to_string_pretty(&merged_config_value(path, &out)?)?);
        if !prompt_yes("确认覆盖以上配置？", true)? {
            println!("已取消，未修改 {}", path.display());
            return Ok(());
        }
    }
    write_pkg_config(path, &out)?;

    // 8. 远程组件类型接入（oui.d.ts 引用 / tsconfig 登记）
    let root = cwd_root(path);
    let enable_types = if args.tsconfig {
        true
    } else if has_remote_types(root) {
        let where_ = if root.join("env.d.ts").is_file() { root.join("env.d.ts") } else { root.join("tsconfig.json") };
        println!("{} 已接入远程组件类型", where_.display());
        false
    } else {
        prompt_yes("接入远程组件类型（建 oui.d.ts 并登记进 tsconfig）？", false)?
    };
    if enable_types {
        report_types(&configure_types(root));
    }
    // 同步 .vscode/settings.json 的 explorer.fileNesting（折叠 oui.d.ts / lock / oui.*.json）
    fix_vscode_settings(root)?;
    Ok(())
}

/// 取父目录（配置所在目录的基准）。
fn cwd_root(path: &std::path::Path) -> &std::path::Path {
    path.parent().unwrap_or(path)
}

// ---------- login（凭据入库 + 工程只留连接名） ----------

/// `oui login`：交互式（或参数）录入 registry/token 并命名连接，写入 `~/.oui/credentials.json`；
/// 同时把当前工程的 oui.json 收敛为 `connection: ["<name>"]`。
fn cmd_login(
    name: Option<&str>,
    registry: Option<&str>,
    token: Option<&str>,
    no_input: bool,
) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let project = find_pkg_config_up(&cwd);
    let store = read_cred();
    let cur_name = project
        .as_ref()
        .and_then(|(_, c)| c.first_connection().cloned())
        .or_else(|| store.default.clone())
        .unwrap_or_else(|| DEFAULT_CONNECTION.to_string());
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

    // 5) 工程配置收敛为连接名（保留 components/uses 等其它内容）
    let mut wrote_project = false;
    if let Some((root, _)) = &project {
        let path = root.join(PKG_CONFIG);
        if let Ok(text) = fs::read(&path)
            && let Ok(mut v) = serde_json::from_slice::<Value>(&text)
            && let Some(obj) = v.as_object_mut()
        {
            obj.insert("connection".into(), json!([name]));
            fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&v)?))?;
            wrote_project = true;
        }
    }

    let masked = if token.is_empty() {
        "no token".to_string()
    } else {
        mask_secret(&token)
    };
    println!("已保存连接 {name}（registry={registry}，token={masked}）→ {}", cred_path().display());
    if wrote_project {
        println!("已更新工程配置的 connection=[{name}]");
    }
    Ok(())
}

/// 令牌脱敏显示：保留前 8 位与后 4 位。
fn mask_secret(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= 12 {
        return "*".repeat(chars.len());
    }

    let head: String = chars[..8].iter().collect();
    let tail: String = chars[chars.len() - 4..].iter().collect();
    format!("{head}...{tail}")
}

fn cmd_hub_add(name: Option<&str>, registry: Option<&str>, token: Option<&str>, no_input: bool) -> Result<()> {
    cmd_login(name, registry, token, no_input)
}

fn cmd_hub_delete(name: &str) -> Result<()> {
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

fn cmd_hub_list() -> Result<()> {
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

fn choose_connections(explicit: &[String], existing: Option<Vec<String>>) -> Result<Vec<String>> {
    let names = split_list(explicit);
    let selected = if names.is_empty() { existing.unwrap_or_default() } else { names };
    if selected.is_empty() {
        bail!("未配置任何 hub 连接，请先运行 `oui hub add`，或用 `oui init --connection <name>`");
    }
    let store = read_cred();
    for name in &selected {
        if !store.connections.contains_key(name) {
            bail!("连接 {name} 不存在，请先运行 `oui hub add --name {name}`");
        }
    }
    Ok(selected)
}

// ---------- fix（工程修复） ----------

/// VS Code 折叠：父文件 → 子文件名（逗号分隔）。
/// `oui.d.ts` / `oui-hub.lock.json` 是固定名；`oui.*.json` 用通配覆盖各连接的 overlay
/// （`oui init` 按连接生成 `oui.<connection>.json`，如 oui.default.json）。
const NEST_PARENT: &str = "oui.json";
const NEST_CHILDREN: [&str; 3] = ["oui.d.ts", "oui-hub.lock.json", "oui.*.json"];

/// `oui fix`：在 oui.json 所在工程根检查并修复
/// 1) 本地类型声明（oui-types/**）：缺失则按 lock 的版本从 registry 重新拉取并重建转发入口；
/// 2) 类型接入（oui.d.ts + tsconfig 引用/登记 + 有类型包的 paths 映射，含过期映射值校正）；
/// 3) 组件工程（components[].types）的声明产出链路：补 tsconfig.dts.json 与 build 脚本前置；
/// 4) .vscode/settings.json 的 explorer.fileNesting（开启 + 把 oui.d.ts / oui-hub.lock.json /
///    oui.*.json 折叠进 oui.json）。
async fn cmd_fix(registry: &Option<String>) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let (root, found) = project_root(&cwd);
    if found.is_none() {
        bail!("当前目录及上级未找到 {PKG_CONFIG}——先运行 `oui init` 或 `oui register <@scope/name>`");
    }
    println!("工程根：{}", root.display());
    let lock = read_lock_at(&root);
    repair_local_types(&root, &lock, &registry_url(registry)).await;
    report_types(&configure_types(&root));
    fix_component_decl_pipeline(&root)?;
    fix_vscode_settings(&root)
}

/// 重建缺失的本地类型声明：lock 登记了 types 的包，若入口或声明文件缺失，按 lock 的 version
/// 取该版本 manifest（`/v/<name>@<version>/manifest.json`，与 latest 无关）重新下载并重建转发入口。
/// 失败只提示（该包退化为 any），不影响其它修复项。
async fn repair_local_types(root: &Path, lock: &Value, registry: &str) {
    let Some(pkgs) = lock.get("packages").and_then(Value::as_object) else {
        return;
    };
    let client = reqwest::Client::new();
    for (name, v) in pkgs {
        let Some(t) = v.get("types") else { continue };
        let version = v.get("version").and_then(Value::as_str).unwrap_or_default();
        let entry = t.get("entry").and_then(Value::as_str).unwrap_or_default();
        let files: Vec<String> = t
            .get("files")
            .and_then(Value::as_array)
            .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
            .unwrap_or_default();
        if entry.is_empty() || version.is_empty() {
            continue;
        }
        if root.join(entry).is_file() && files.iter().all(|f| root.join(f).is_file()) {
            continue;
        }
        let url = format!("{registry}/v/{name}@{version}/manifest.json");
        let rebuilt = async {
            let resp = client
                .get(&url)
                .send()
                .await
                .with_context(|| format!("请求 hub 失败: {url}"))?;
            if !resp.status().is_success() {
                bail!("{url} → HTTP {}", resp.status());
            }
            let m: Value = resp.json().await.with_context(|| format!("解析 manifest 失败: {url}"))?;
            let remote_entry = m["entry"]["types"]
                .as_str()
                .ok_or_else(|| anyhow!("{name}@{version} 的 manifest 未提供 entry.types"))?;
            let remote_files: Vec<String> = m["entry"]["typesFiles"]
                .as_array()
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                .unwrap_or_default();
            fetch_pkg_types(&client, registry, name, version, remote_entry, &remote_files, root).await
        }
        .await;
        match rebuilt {
            Ok(n) => println!("已重建 {name}@{version} 的本地类型声明（{} 个文件）→ {entry}", n.len()),
            Err(e) => println!("类型声明重建失败：{e}"),
        }
    }
}

// ---------- 组件工程：声明产出链路（fix 的第 3 项） ----------

/// 组件工程（oui.json 的 components 里有未显式关闭类型的条目）的声明产出链路修复：
/// 1) 缺 `tsconfig.dts.json` → 按工程布局生成（只产 .d.ts，输出到 .oui-hub/types/，随构建临时区清理）；
/// 2) package.json 的 build 脚本缺声明前置 → 补上（.vue 用 vue-tsc，纯 TS 用 tsc）。
///
/// 全部条目显式 `types: false`（或未登记任何组件）的工程（纯使用者项目）不碰任何文件。
fn fix_component_decl_pipeline(root: &Path) -> Result<()> {
    let Some(cfg) = read_pkg_config(root) else {
        return Ok(());
    };
    if cfg.components.iter().all(|c| c.types.as_ref().is_some_and(types_disabled)) {
        return Ok(());
    }

    let cfg_path = root.join(DTS_TSCONFIG);
    if !cfg_path.is_file() {
        fs::write(&cfg_path, dts_tsconfig_content(root, &cfg))
            .with_context(|| format!("写入失败: {}", cfg_path.display()))?;
        println!("已生成 {}（组件声明产出）", cfg_path.display());
    }

    let cmd = decl_cmd(root, &cfg);
    if cmd.starts_with("vue-tsc") && !root.join("node_modules/vue-tsc").is_dir() {
        println!("提示：未检测到 vue-tsc（.vue 组件产声明需要它）——请先 `pnpm add -D vue-tsc`");
    }

    let pkg_json = root.join("package.json");
    let Ok(text) = fs::read_to_string(&pkg_json) else {
        println!("提示：未找到 {}，构建脚本需前置 `{cmd} &&`", pkg_json.display());
        return Ok(());
    };
    let Some(build) = json_string_value(&text, "build") else {
        println!("提示：package.json 无 build 脚本——请加上 `\"build\": \"{cmd} && vite build\"`");
        return Ok(());
    };
    if build.contains(DTS_TSCONFIG) {
        return Ok(());
    }
    match replace_json_string_value(&text, "build", &format!("{cmd} && {build}")) {
        Some(next) => {
            fs::write(&pkg_json, next).with_context(|| format!("写入失败: {}", pkg_json.display()))?;
            println!("已在 package.json 的 build 脚本前置 `{cmd} &&`");
        }
        None => println!("提示：package.json 的 build 脚本未改动，请自行前置 `{cmd} &&`"),
    }
    Ok(())
}

/// 声明产出的驱动命令：工程含 .vue 组件用 vue-tsc（tsc 不解析 SFC），否则用 tsc。
fn decl_cmd(root: &Path, cfg: &PkgConfigFile) -> String {
    let has_vue = has_vue_files(&decl_root_dir(root, cfg), 0)
        || cfg.components.iter().any(|c| {
            c.entry.as_deref().is_some_and(|e| e.ends_with(".vue"))
                || c.source.as_ref().is_some_and(|s| s.iter().any(|f| f.ends_with(".vue")))
        });
    let tool = if has_vue { "vue-tsc" } else { "tsc" };
    format!("{tool} -p {DTS_TSCONFIG}")
}

/// 声明产出的源码根：优先 `src/`，否则取各组件 entry 目录的公共前缀，兜底工程根。
fn decl_root_dir(root: &Path, cfg: &PkgConfigFile) -> PathBuf {
    if root.join("src").is_dir() {
        return root.join("src");
    }
    let dirs: Vec<String> = cfg
        .components
        .iter()
        .filter_map(|c| c.entry.as_deref())
        .map(|e| e.rsplit_once('/').map(|(d, _)| d.to_string()).unwrap_or_default())
        .filter(|d| !d.is_empty())
        .collect();
    let mut common: Option<Vec<&str>> = None;
    for d in &dirs {
        let segs: Vec<&str> = d.split('/').collect();
        common = Some(match common {
            None => segs,
            Some(prev) => prev
                .into_iter()
                .zip(segs.iter().copied())
                .take_while(|(a, b)| a == b)
                .map(|(a, _)| a)
                .collect(),
        });
    }
    match common {
        Some(segs) if !segs.is_empty() => root.join(segs.join("/")),
        _ => root.to_path_buf(),
    }
}

/// `tsconfig.dts.json` 模板（与工程布局对齐；目录为工程根时用 `**/*` 通配）。
fn dts_tsconfig_content(root: &Path, cfg: &PkgConfigFile) -> String {
    let dir_root = decl_root_dir(root, cfg);
    let dir = dir_root
        .strip_prefix(root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();
    let (root_dir, ts, vue) = if dir.is_empty() {
        (".", "**/*.ts".to_string(), "**/*.vue".to_string())
    } else {
        (dir.as_str(), format!("{dir}/**/*.ts"), format!("{dir}/**/*.vue"))
    };
    format!(
        "{{\n  \"compilerOptions\": {{\n    \"target\": \"ESNext\",\n    \"module\": \"ESNext\",\n    \"moduleResolution\": \"bundler\",\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"declaration\": true,\n    \"emitDeclarationOnly\": true,\n    \"rootDir\": \"{root_dir}\",\n    \"outDir\": \".oui-hub/types\"\n  }},\n  \"include\": [\"{ts}\", \"{vue}\"]\n}}\n"
    )
}

/// 读 JSON 文本里 `"key": "value"` 的字符串值（脚本命令不含转义引号，故不做转义处理）。
fn json_string_value(text: &str, key: &str) -> Option<String> {
    let key_end = find_key(text, key)?;
    let bytes = text.as_bytes();
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'"') {
        return None;
    }
    let start = i + 1;
    let end = text[start..].find('"')? + start;
    Some(text[start..end].to_string())
}

/// 替换 `"key": "..."` 的字符串值；键不存在或值相同 → None。
fn replace_json_string_value(text: &str, key: &str, new: &str) -> Option<String> {
    let key_end = find_key(text, key)?;
    let bytes = text.as_bytes();
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'"') {
        return None;
    }
    let start = i + 1;
    let end = text[start..].find('"')? + start;
    if &text[start..end] == new {
        return None;
    }
    let mut out = String::with_capacity(text.len());
    out.push_str(&text[..start]);
    out.push_str(new);
    out.push_str(&text[end..]);
    Some(out)
}

/// 定位 `.vscode` 目录：从工程根起向上最多 5 层找已存在的 `.vscode`（monorepo 布局下
/// 通常落在仓库根），搜索不超过用户主目录；找不到 → 工程根下的 `.vscode`（由调用方创建）。
fn find_vscode_dir(root: &Path) -> PathBuf {
    let home = os_home();
    let mut dir: Option<&Path> = Some(root);
    for _ in 0..=5 {
        let Some(d) = dir else { break };
        if home.as_deref() == Some(d) {
            break;
        }
        let candidate = d.join(".vscode");
        if candidate.is_dir() {
            return candidate;
        }
        dir = d.parent();
    }
    root.join(".vscode")
}

/// 修 `.vscode/settings.json`：开启 file nesting，并把 oui 相关文件（oui.d.ts /
/// oui-hub.lock.json / oui.*.json 连接 overlay）折叠进 oui.json。
/// `oui init` 与 `oui fix` 共用（幂等：已就绪则不改动）。
fn fix_vscode_settings(root: &Path) -> Result<()> {
    let dir = find_vscode_dir(root);
    let file = dir.join("settings.json");
    if !file.is_file() {
        fs::create_dir_all(&dir).with_context(|| format!("创建目录失败: {}", dir.display()))?;
        let content = format!(
            "{{\n  \"explorer.fileNesting.enabled\": true,\n  \"explorer.fileNesting.patterns\": {{\n    \"{NEST_PARENT}\": \"{}\"\n  }}\n}}\n",
            NEST_CHILDREN.join(", ")
        );
        fs::write(&file, content).with_context(|| format!("写入失败: {}", file.display()))?;
        println!("已创建 {}（file nesting）", file.display());
        return Ok(());
    }

    let text = fs::read_to_string(&file).with_context(|| format!("读取失败: {}", file.display()))?;
    let mut next = text.clone();
    let mut notes: Vec<&str> = Vec::new();

    // 1) fileNesting.enabled → true
    if next.contains("\"explorer.fileNesting.enabled\"") {
        if let Some(pos) = find_value_pos(&next, "explorer.fileNesting.enabled")
            && next[pos..].starts_with("false")
        {
            next.replace_range(pos..pos + 5, "true");
            notes.push("开启 fileNesting");
        }
    } else if let Some(fn_pos) = next.find("\"fileNesting\"") {
        // 嵌套样式：在 fileNesting 对象里处理 enabled
        let tail = next[fn_pos..].to_string();
        if let Some(rel) = find_value_pos(&tail, "enabled") {
            let abs = fn_pos + rel;
            if next[abs..].starts_with("false") {
                next.replace_range(abs..abs + 5, "true");
                notes.push("开启 fileNesting");
            }
        } else if let Some(s) = insert_into_object(&next, "fileNesting", "\"enabled\": true") {
            next = s;
            notes.push("开启 fileNesting");
        }
    } else if let Some(pos) = next.find('{') {
        next.insert_str(pos + 1, "\n  \"explorer.fileNesting.enabled\": true,");
        notes.push("开启 fileNesting");
    }

    // 2) patterns：补全 oui.json 的子项（固定名 + 各连接的 overlay）
    let merged = merged_children(&next);
    match merged {
        ChildState::Already => {}
        ChildState::Merged(value) => {
            next = if let Some(pos) = find_string_value_of(&next, NEST_PARENT) {
                replace_string_value(&next, pos, &value)
            } else if next.contains("\"explorer.fileNesting.patterns\"") {
                insert_into_object(&next, "explorer.fileNesting.patterns", &format!("\"{NEST_PARENT}\": \"{value}\"")).unwrap_or(next)
            } else if next.contains("\"patterns\"") {
                insert_into_object(&next, "patterns", &format!("\"{NEST_PARENT}\": \"{value}\"")).unwrap_or(next)
            } else if next.contains("\"fileNesting\"") {
                insert_into_object(&next, "fileNesting", &format!("\"patterns\": {{ \"{NEST_PARENT}\": \"{value}\" }},")).unwrap_or(next)
            } else if let Some(pos) = next.find('{') {
                let mut s = next.clone();
                s.insert_str(pos + 1, &format!("\n  \"explorer.fileNesting.patterns\": {{ \"{NEST_PARENT}\": \"{value}\" }},"));
                s
            } else {
                next
            };
            notes.push("折叠 oui.json 相关文件");
        }
        ChildState::Missing => {
            next = if next.contains("\"explorer.fileNesting.patterns\"") {
                insert_into_object(&next, "explorer.fileNesting.patterns", &format!("\"{NEST_PARENT}\": \"{}\"", NEST_CHILDREN.join(", "))).unwrap_or(next)
            } else if next.contains("\"patterns\"") {
                insert_into_object(&next, "patterns", &format!("\"{NEST_PARENT}\": \"{}\"", NEST_CHILDREN.join(", "))).unwrap_or(next)
            } else if next.contains("\"fileNesting\"") {
                insert_into_object(&next, "fileNesting", &format!("\"patterns\": {{ \"{NEST_PARENT}\": \"{}\" }},", NEST_CHILDREN.join(", "))).unwrap_or(next)
            } else if let Some(pos) = next.find('{') {
                let mut s = next.clone();
                s.insert_str(pos + 1, &format!("\n  \"explorer.fileNesting.patterns\": {{ \"{NEST_PARENT}\": \"{}\" }},", NEST_CHILDREN.join(", ")));
                s
            } else {
                next
            };
            notes.push("折叠 oui.json 相关文件");
        }
    }

    if next == text {
        println!("{}：已就绪，未改动", file.display());
        return Ok(());
    }
    fs::write(&file, next).with_context(|| format!("写入失败: {}", file.display()))?;
    println!("已更新 {}（file nesting）", file.display());
    Ok(())
}

/// fileNesting 子项检查结果。
enum ChildState {
    /// patterns 已含全部 oui 相关子项（无需写入）
    Already,
    /// 已有 patterns，但需把 oui 相关子项合并进去
    Merged(String),
    /// patterns 尚未写入 oui.json 条目
    Missing,
}

/// 现有 patterns 里 oui.json 的子项状态。
fn merged_children(text: &str) -> ChildState {
    let Some(pos) = find_string_value_of(text, NEST_PARENT) else {
        return ChildState::Missing;
    };
    let (value, _) = read_string_value(text, pos);
    let mut list: Vec<String> = value
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let mut changed = false;
    for c in NEST_CHILDREN {
        if !list.iter().any(|x| x == c) {
            list.push(c.to_string());
            changed = true;
        }
    }
    if changed {
        ChildState::Merged(list.join(", "))
    } else {
        ChildState::Already
    }
}

/// 找到 `"key": ` 之后的值起始位置（首个非空白字符）；找不到返回 None。
fn find_value_pos(text: &str, key: &str) -> Option<usize> {
    let bytes = text.as_bytes();
    let key_end = find_key(text, key)?;
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    (i < bytes.len()).then_some(i)
}

/// 找到 `"key"` 之后的字符串值起始位置（指向开引号）；找不到返回 None。
fn find_string_value_of(text: &str, key: &str) -> Option<usize> {
    let i = find_value_pos(text, key)?;
    (text.as_bytes().get(i) == Some(&b'"')).then_some(i)
}

/// 读取从 `start`（开引号）开始的字符串值，返回 (内容, 结束引号后位置)。
fn read_string_value(text: &str, start: usize) -> (String, usize) {
    let bytes = text.as_bytes();
    let mut i = start + 1;
    while i < bytes.len() && bytes[i] != b'"' {
        i += 1;
    }
    (text[start + 1..i].to_string(), (i + 1).min(text.len()))
}

/// 用 `value` 替换从 `start` 开始的字符串值内容。
fn replace_string_value(text: &str, start: usize, value: &str) -> String {
    let (_, end) = read_string_value(text, start);
    format!("{}{}{}", &text[..start + 1], value, &text[end - 1..])
}

// ---------- register（发布侧登记组件） ----------

/// `oui register <@scope/name>`：把组件 upsert 进 oui.json 的 components[]。
/// 缺 version/entry 时交互式补问（`--no-input` 则直接报错）；保留文件内其他字段原样。
fn cmd_register(
    pkg: &str,
    version: Option<&str>,
    entry: Option<&str>,
    source: &[String],
    description: Option<&str>,
    kind: &Option<String>,
    css_strategy: &Option<String>,
    out_dir: Option<&str>,
    types: Option<&str>,
    no_input: bool,
) -> Result<()> {
    let name = pkg.trim();
    if !is_scoped_name(name) {
        bail!("包名格式错误（应为 @scope/name）: {name}");
    }
    let cwd = std::env::current_dir()?;
    // 工程根 = 配置所在目录（无配置时取最近的含 package.json 的祖先）；entry/source/outDir 相对它
    let (root, found) = project_root(&cwd);
    let path = root.join(PKG_CONFIG);
    if path.is_file() && read_pkg_config(&root).is_none() {
        bail!("{} 存在但解析失败（JSON 畸形或字段类型错误）；请先修正，避免覆盖已有配置", path.display());
    }
    let typified = found;
    let existing = typified
        .as_ref()
        .and_then(|c| c.components.iter().find(|x| x.name == name))
        .cloned();

    // 默认值来源：已登记条目 → 项目 package.json
    let pj_version = read_package_json(&root).map(|(v, _)| v).filter(|v| !v.is_empty());
    let def_version = existing
        .as_ref()
        .map(|c| c.version.clone())
        .filter(|v| !v.is_empty())
        .or(pj_version);
    let def_entry = existing.as_ref().and_then(|c| c.entry.clone()).unwrap_or_default();
    let def_source = existing
        .as_ref()
        .and_then(|c| c.source.as_ref())
        .map(|s| s.join(", "))
        .unwrap_or_default();
    let def_desc = existing
        .as_ref()
        .and_then(|c| c.description.clone())
        .unwrap_or_default();

    // version
    let version = match version.map(str::trim).filter(|s| !s.is_empty()) {
        Some(v) => {
            if !is_version(v) {
                bail!("版本格式错误（应为 x.y.z）: {v}");
            }
            v.to_string()
        }
        None if no_input => bail!("缺少 --version x.y.z（--no-input 模式不询问）"),
        None => loop {
            let v = prompt_default("组件 version", &def_version.clone().unwrap_or_else(|| "0.1.0".into()))?;
            if is_version(&v) {
                break v;
            }
            eprintln!("版本格式错误（应为 x.y.z）: {v}");
        },
    };

    // entry
    let entry = match entry.map(str::trim).filter(|s| !s.is_empty()) {
        Some(e) => e.to_string(),
        None if no_input => bail!("缺少 --entry <组件源入口>（--no-input 模式不询问）"),
        None => loop {
            let e = prompt_default("entry", &def_entry)?;
            if !e.is_empty() {
                break e;
            }
            eprintln!("entry 不能为空");
        },
    };

    // source / description
    let source = if !source.is_empty() {
        split_list(source)
    } else if no_input {
        Vec::new()
    } else {
        split_list(&[prompt_default("source files", &def_source)?])
    };
    let description = match description.map(str::trim).filter(|s| !s.is_empty()) {
        Some(d) => d.to_string(),
        None if no_input => String::new(),
        None => prompt_default("组件 description（可空）", &def_desc)?,
    };

    // 原始 JSON 保真 upsert（未知字段/其他条目原样保留）
    let mut root: Value = if path.is_file() {
        serde_json::from_slice(&fs::read(&path)?)?
    } else {
        json!({})
    };
    let obj = root
        .as_object_mut()
        .ok_or_else(|| anyhow!("{} 顶层应为 JSON 对象", path.display()))?;
    let arr = obj
        .entry("components".to_string())
        .or_insert_with(|| json!([]))
        .as_array_mut()
        .ok_or_else(|| anyhow!("{} 的 components 应为数组", path.display()))?;

    // 基于既有条目合并：未给出的字段保留原值
    let pos = arr.iter().position(|c| c.get("name").and_then(Value::as_str) == Some(name));
    let mut m = match pos {
        Some(i) => arr[i].as_object().cloned().unwrap_or_default(),
        None => serde_json::Map::new(),
    };
    m.insert("name".into(), json!(name));
    m.insert("version".into(), json!(version));
    m.insert("entry".into(), json!(entry));
    if !source.is_empty() {
        m.insert("source".into(), json!(source));
    }
    if !description.is_empty() {
        m.insert("description".into(), json!(description));
    }
    for (key, val) in [("type", kind), ("cssStrategy", css_strategy)] {
        if let Some(v) = val.as_ref().filter(|s| !s.is_empty()) {
            m.insert(key.into(), json!(v));
        }
    }
    if let Some(o) = out_dir.filter(|s| !s.is_empty()) {
        m.insert("outDir".into(), json!(o));
    }
    match types.map(str::trim) {
        None => {}
        Some("") => {
            m.remove("types"); // 清除 → 回到自动推导
        }
        Some("false") => {
            m.insert("types".into(), json!(false));
        }
        Some(t) => {
            m.insert("types".into(), json!(t));
        }
    }

    match pos {
        Some(i) => arr[i] = Value::Object(m),
        None => arr.push(Value::Object(m)),
    }
    let count = arr.len();
    fs::write(&path, format!("{}\n", serde_json::to_string_pretty(&root)?))?;
    println!("已登记组件 {name}@{version}（components 共 {count} 项）");
    println!("发布：先 vite build（或 SubPackage 构建），再执行 oui publish");
    Ok(())
}

// ---------- 发布令牌解析（flag > env OUI_TOKEN > 连接凭据） ----------

/// 工程根（所有 components/uses 路径的基准）：
/// 1) 从 `from` 向上找首个含 `oui.json` 的目录；
/// 2) 否则找首个含 `package.json` 的目录（工程根通常在项目清单处）；
/// 3) 都没有 → `from` 自身。
fn project_root(from: &Path) -> (PathBuf, Option<PkgConfigFile>) {
    let mut dir: Option<&Path> = Some(from);
    let mut pkg_fallback: Option<PathBuf> = None;
    while let Some(d) = dir {
        if let Some(cfg) = read_pkg_config(d) {
            return (d.to_path_buf(), Some(cfg));
        }
        if pkg_fallback.is_none() && d.join("package.json").is_file() {
            pkg_fallback = Some(d.to_path_buf());
        }
        dir = d.parent();
    }
    (pkg_fallback.unwrap_or_else(|| from.to_path_buf()), None)
}

/// 工程是否已接入远程组件类型（根 oui.d.ts 存在，或 tsconfig.json 已引用/登记）。
fn has_remote_types(root: &Path) -> bool {
    if root.join(TYPES_FILE).is_file() {
        return true;
    }
    fs::read_to_string(root.join(MAIN_TSCONFIG))
        .map(|t| t.contains(REF_TSCONFIG) || t.contains(TYPES_FILE))
        .unwrap_or(false)
}

/// 类型声明文件的处理结果。
enum TypesEdit {
    /// 生成了声明文件
    Written(Vec<PathBuf>),
    /// 已是最新，无需改动
    Already(PathBuf),
    /// 工程自行维护（含手写引用），不自动改写
    Manual(PathBuf),
}

/// 工程根的类型入口文件：内容转发 @openui_hub/plugin_vite 的声明（声明真源在该包内）。
const TYPES_FILE: &str = "oui.d.ts";
const MAIN_TSCONFIG: &str = "tsconfig.json";
/// references 模式下被 tsconfig.json 引用的独立工程文件。
const REF_TSCONFIG: &str = "tsconfig.oui.json";
/// references 模式下「编译源码」的工程文件（solution-style 必须有工程包含源码）。
const APP_TSCONFIG: &str = "tsconfig.app.json";
const REMOTE_REF: &str = "/// <reference types=\"@openui_hub/plugin_vite/remote\" />";

fn types_file_content() -> String {
    format!("/* 由 oui 生成（oui init --tsconfig / oui use --with-types）：引入远程组件类型声明，请勿手改。 */\n{REMOTE_REF}\n")
}

/// Generated type references for tsconfig.
/// （声明必须与源码同 Program，否则源码落进编辑器的 inferred project 看不到声明）。
fn ref_tsconfig_content(with_sources: bool, paths: &BTreeMap<String, String>) -> String {
    let include = if with_sources {
        "[\"src/**/*\", \"src/**/*.vue\", \"oui.d.ts\"]"
    } else {
        "[\"oui.d.ts\"]"
    };
    let paths = paths_block(paths);
    format!(
        "{{\n  \"include\": {include},\n  \"compilerOptions\": {{\n{paths}    \"composite\": true,\n    \"noEmit\": true,\n    \"tsBuildInfoFile\": \"./node_modules/.tmp/tsconfig.oui.tsbuildinfo\",\n    \"target\": \"ESNext\",\n    \"module\": \"ESNext\",\n    \"moduleResolution\": \"bundler\",\n    \"skipLibCheck\": true\n  }}\n}}\n"
    )
}

/// 工程内已有的、覆盖源码的工程配置（如 create-vue 的 tsconfig.app.json）。
fn source_project_covering_src(root: &Path) -> Option<PathBuf> {
    for name in [APP_TSCONFIG, "tsconfig.web.json", "tsconfig.client.json"] {
        let p = root.join(name);
        if p.is_file() {
            let text = fs::read_to_string(&p).unwrap_or_default();
            if text.contains("src") && (text.contains("\"include\"") || text.contains("\"files\"")) {
                return Some(p);
            }
        }
    }
    None
}

fn find_key(text: &str, key: &str) -> Option<usize> {
    let pat = format!("\"{key}\"");
    text.find(&pat).map(|i| i + pat.len())
}

fn skip_ws(bytes: &[u8], mut i: usize) -> usize {
    while matches!(bytes.get(i), Some(c) if c.is_ascii_whitespace()) {
        i += 1;
    }
    i
}

/// 内容有变化才写入；返回是否实际写入。
fn write_if_changed(path: &Path, content: &str) -> Result<bool, ()> {
    if fs::read_to_string(path).map(|t| t == content).unwrap_or(false) {
        return Ok(false);
    }
    fs::write(path, content).map(|_| true).map_err(|_| ())
}

/// 把 `item`（JSON 片段）插入 `"key": [...]` 数组开头；无该键或非数组返回 None。
fn insert_into_array(text: &str, key: &str, item: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let key_end = find_key(text, key)?;
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'[') {
        return None;
    }
    let inner = skip_ws(bytes, i + 1);
    let ins = if bytes.get(inner) == Some(&b']') {
        item.to_string()
    } else {
        format!("{item}, ")
    };
    let mut out = String::with_capacity(text.len() + ins.len());
    out.push_str(&text[..=i]);
    out.push_str(&ins);
    out.push_str(&text[i + 1..]);
    Some(out)
}

/// src 树下是否存在 .vue（用于提示 vue-tsc；深度上限防御性递归）。
fn has_vue_files(dir: &Path, depth: usize) -> bool {
    if depth > 6 {
        return false;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return false;
    };
    for e in entries.flatten() {
        let p = e.path();
        let name = e.file_name();
        let name = name.to_string_lossy();
        if name == "node_modules" || name.starts_with('.') {
            continue;
        }
        if p.is_dir() {
            if has_vue_files(&p, depth + 1) {
                return true;
            }
        } else if name.ends_with(".vue") {
            return true;
        }
    }
    false
}

/// 把 `entry`（JSON 片段，不带尾逗号）插入 `"key": { ... }` 对象开头；无该键或非对象返回 None。
/// 成功则返回插入后的完整文本。
fn insert_into_object(text: &str, key: &str, entry: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let key_end = find_key(text, key)?;
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'{') {
        return None;
    }
    let inner = skip_ws(bytes, i + 1);
    let non_empty = bytes.get(inner) != Some(&b'}');
    let trimmed = entry.trim_end().trim_end_matches(',');
    let ins = if non_empty {
        format!("\n    {trimmed},")
    } else {
        format!("\n    {trimmed}")
    };
    let mut out = String::with_capacity(text.len() + ins.len());
    out.push_str(&text[..=i]);
    out.push_str(&ins);
    out.push_str(&text[i + 1..]);
    Some(out)
}

// ---------- 远程类型：本地落盘（oui-types/）+ tsconfig paths 映射 ----------

/// 读工程根的 lock（文件名取 oui.json 的 lockFile，缺省 oui-hub.lock.json）。
fn read_lock_at(root: &Path) -> Value {
    let name = read_pkg_config(root)
        .and_then(|c| c.lock_file)
        .unwrap_or_else(|| LOCK_FILE.to_string());
    fs::read(root.join(name))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_else(|| json!({}))
}

/// lock 中「有类型的包」→ tsconfig paths 映射：`oui-hub:<name>` → `./<本地入口，去 .d.ts>`。
/// 值指向 <pkg>/index.d.ts（不随版本变化），故插入后无需再改写。
fn type_paths_of(lock: &Value) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let Some(pkgs) = lock.get("packages").and_then(Value::as_object) else {
        return out;
    };
    for (name, v) in pkgs {
        let Some(entry) = v.get("types").and_then(|t| t.get("entry")).and_then(Value::as_str) else {
            continue;
        };
        let spec = entry.strip_suffix(".d.ts").unwrap_or(entry);
        out.insert(format!("oui-hub:{name}"), format!("./{spec}"));
    }
    out
}

/// tsconfig.oui.json 里的 paths 片段（无映射则空串）。
fn paths_block(paths: &BTreeMap<String, String>) -> String {
    if paths.is_empty() {
        return String::new();
    }
    let mut s = String::from("    \"paths\": {\n");
    let items: Vec<String> = paths
        .iter()
        .map(|(k, v)| format!("      \"{k}\": [\"{v}\"]"))
        .collect();
    s.push_str(&items.join(",\n"));
    s.push_str("\n    },\n");
    s
}

/// 在 JSONC 文本的 compilerOptions.paths 里插入一条映射（键已存在则不动）。
fn insert_path_mapping(text: &str, key: &str, value: &str) -> Option<String> {
    if text.contains(&format!("\"{key}\"")) {
        return None;
    }
    let entry = format!("\"{key}\": [\"{value}\"]");
    if let Some(key_end) = find_key(text, "paths") {
        let open = text[key_end..].find('{')? + key_end;
        let mut out = text.to_string();
        out.insert_str(open + 1, &format!("\n      {entry},"));
        return Some(out);
    }
    insert_into_object(text, "compilerOptions", &format!("\"paths\": {{ {entry} }}"))
}

/// 把 JSONC 文本里 `"key"` 的数组值替换为 `["value"]`；键不存在或值已一致 → None。
fn set_path_mapping(text: &str, key: &str, value: &str) -> Option<String> {
    let key_end = find_key(text, key)?;
    let bytes = text.as_bytes();
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'[') {
        return None;
    }
    // 扫描到匹配的 `]`（字符串内不计数）
    let mut depth = 0usize;
    let mut j = i;
    let mut in_str = false;
    while j < bytes.len() {
        let c = bytes[j];
        if in_str {
            if c == b'\\' {
                j += 2;
                continue;
            }
            if c == b'"' {
                in_str = false;
            }
        } else if c == b'"' {
            in_str = true;
        } else if c == b'[' {
            depth += 1;
        } else if c == b']' {
            depth -= 1;
            if depth == 0 {
                break;
            }
        }
        j += 1;
    }
    if depth != 0 {
        return None;
    }
    let want = format!("[\"{value}\"]");
    if text[i..=j] == want {
        return None;
    }
    let mut out = String::with_capacity(text.len());
    out.push_str(&text[..i]);
    out.push_str(&want);
    out.push_str(&text[j + 1..]);
    Some(out)
}

/// 逐条把 paths 映射写入 JSONC 文本：缺键则插入，值不对（过期/指向不存在的声明）则改写；无改动返回 None。
fn merge_paths(text: &str, paths: &BTreeMap<String, String>) -> Option<String> {
    let mut cur = text.to_string();
    let mut changed = false;
    for (k, v) in paths {
        let next = if cur.contains(&format!("\"{k}\"")) {
            set_path_mapping(&cur, k, v)
        } else {
            insert_path_mapping(&cur, k, v)
        };
        if let Some(n) = next {
            cur = n;
            changed = true;
        }
    }
    changed.then_some(cur)
}

/// 入口声明是否导出 default（决定转发入口要不要再 `export { default }`）。
fn declares_default_export(text: &str) -> bool {
    text.contains("export default")
        || text.lines().any(|l| {
            let t = l.trim_start();
            t.starts_with("export {") && t.contains("default")
        })
}

/// 下载某包全部声明文件到 `<root>/oui-types/<name>/<version>/`，并生成转发入口
/// `<root>/oui-types/<name>/index.d.ts`（入口里对同目录声明的相对引用保持可解析）。
/// 拉取成功后落盘到本地类型目录，并重建转发入口。
async fn fetch_pkg_types(
    client: &reqwest::Client,
    reg: &str,
    base: &str,
    version: &str,
    entry: &str,
    files: &[String],
    root: &Path,
) -> Result<Vec<String>> {
    const PREFIX: &str = "types/";
    let pkg_dir = root.join(TYPES_DIR).join(base);
    let ver_dir = pkg_dir.join(version);
    // 清掉其它版本残留（index.d.ts 只转发当前版本）
    if pkg_dir.is_dir() {
        for ent in fs::read_dir(&pkg_dir)?.flatten() {
            let p = ent.path();
            if p.is_dir() && ent.file_name().to_string_lossy() != version {
                let _ = fs::remove_dir_all(&p);
            }
        }
    }
    let mut local: Vec<String> = Vec::new();
    for rel in files {
        let sub = rel
            .strip_prefix(PREFIX)
            .ok_or_else(|| anyhow!("manifest 类型路径异常（应以 {PREFIX} 开头）: {rel}"))?;
        let url = format!("{reg}/v/{base}@{version}/{rel}");
        let resp = client
            .get(&url)
            .send()
            .await
            .with_context(|| format!("请求类型声明失败: {url}"))?;
        if !resp.status().is_success() {
            bail!("{url} → HTTP {}", resp.status());
        }
        let dst = ver_dir.join(sub);
        if let Some(p) = dst.parent() {
            fs::create_dir_all(p).with_context(|| format!("创建目录失败: {}", p.display()))?;
        }
        fs::write(&dst, resp.bytes().await?).with_context(|| format!("写入失败: {}", dst.display()))?;
        local.push(format!("{TYPES_DIR}/{base}/{version}/{sub}"));
    }

    let entry_sub = entry
        .strip_prefix(PREFIX)
        .ok_or_else(|| anyhow!("manifest entry.types 异常（应以 {PREFIX} 开头）: {entry}"))?;
    let entry_spec = entry_sub
        .strip_suffix(".d.ts")
        .or_else(|| entry_sub.strip_suffix(".d.mts"))
        .unwrap_or(entry_sub);
    let has_default = fs::read_to_string(ver_dir.join(entry_sub))
        .map(|t| declares_default_export(&t))
        .unwrap_or(false);
    let mut content = String::from("/* 由 oui 生成（oui use / oui fix），请勿手改。 */\n");
    content.push_str(&format!("export * from './{version}/{entry_spec}';\n"));
    if has_default {
        content.push_str(&format!("export {{ default }} from './{version}/{entry_spec}';\n"));
    }
    let index = pkg_dir.join("index.d.ts");
    fs::write(&index, content).with_context(|| format!("写入失败: {}", index.display()))?;
    Ok(local)
}

/// 生成/修复类型接入文件（4 步）：
/// 1) 根目录建 `oui.d.ts`（三斜杠引用 `@openui_hub/plugin_vite/remote`）；
/// 2) 无 `tsconfig.json` → 自建 references 模式（tsconfig.json 引用 ./tsconfig.oui.json）；
/// 3) references 模式 → references 加 `./tsconfig.oui.json`；该文件承载声明，工程里没有别的含源码工程时连 `src/**` 一起收录；
/// 4) 有但非 references → 把 `oui.d.ts` 登记进 include（无 include 试 files；都没有则 TS 默认包含根目录）。
///
/// 5) 有类型的包 → 在「包含源码」的那个 tsconfig 里插 `compilerOptions.paths` 映射
///    （`oui-hub:<name>` → `./oui-types/<name>/index.d.ts`，由 `oui use` 落盘）。
///
/// 注意：project references 之间只共享"声明产物"，被引用工程里只放 `.d.ts` 传不到引用方；
/// 且 solution-style 下若没有工程包含 `src/`，源码文件会落进编辑器的 inferred project 而看不到声明。
/// 因此 references 模式必须同时具备一个包含源码（并在 include 里带上 oui.d.ts）的工程。
fn configure_types(root: &Path) -> TypesEdit {
    let dts = root.join(TYPES_FILE);
    let main = root.join(MAIN_TSCONFIG);
    let ref_cfg = root.join(REF_TSCONFIG);
    // 有类型的包 → paths 映射（值指向 oui-types/<pkg>/index.d.ts，不随版本变化）
    let paths = type_paths_of(&read_lock_at(root));
    let mut written: Vec<PathBuf> = Vec::new();
    match write_if_changed(&dts, &types_file_content()) {
        Ok(true) => written.push(dts.clone()),
        Ok(false) => {}
        Err(()) => return TypesEdit::Manual(dts),
    }

    // 无 tsconfig.json → 建 solution-style 骨架（references 模式）
    let text = if main.is_file() {
        fs::read_to_string(&main).unwrap_or_default()
    } else {
        let skeleton = "{\n  \"files\": [],\n  \"references\": []\n}\n";
        if write_if_changed(&main, skeleton).is_err() {
            return TypesEdit::Manual(main);
        }
        written.push(main.clone());
        skeleton.to_string()
    };

    if text.contains("\"references\"") {
        // (a) 登记 tsconfig.oui.json
        let text = fs::read_to_string(&main).unwrap_or_default();
        if !text.contains(REF_TSCONFIG) {
            match insert_into_array(&text, "references", "{ \"path\": \"./tsconfig.oui.json\" }") {
                Some(next) => {
                    if fs::write(&main, &next).is_err() {
                        return TypesEdit::Manual(main);
                    }
                    written.push(main.clone());
                }
                None => return TypesEdit::Manual(main),
            }
        }

        // (b) tsconfig.oui.json 承载声明；若工程里没有别的"含源码"的工程，连源码一起放进它
        //     （声明必须与源码同 Program：否则源码会落进编辑器的 inferred project 而看不到声明）
        let source_project = source_project_covering_src(root);
        let with_sources = source_project.is_none();
        match write_if_changed(&ref_cfg, &ref_tsconfig_content(with_sources, &paths)) {
            Ok(true) => written.push(ref_cfg.clone()),
            Ok(false) => {}
            Err(()) => return TypesEdit::Manual(ref_cfg),
        }
        if with_sources && has_vue_files(&root.join("src"), 0) {
            println!("提示：工程含 .vue，类型检查请用 `vue-tsc -p {REF_TSCONFIG}`");
        }

        // (c) 若已有独立源码工程（如 create-vue 的 tsconfig.app.json）→ oui.d.ts 与 paths 都登记进它
        if let Some(app) = source_project {
            let mut app_text = fs::read_to_string(&app).unwrap_or_default();
            if !app_text.contains("\"composite\"") {
                // 被 references 引用的工程必须 composite
                if let Some(next) = insert_into_object(&app_text, "compilerOptions", "\"composite\": true,") {
                    if fs::write(&app, &next).is_err() {
                        return TypesEdit::Manual(app);
                    }
                    written.push(app.clone());
                    app_text = next;
                }
            }
            if !app_text.contains(TYPES_FILE)
                && let Some(next) = insert_into_array(&app_text, "include", "\"oui.d.ts\"")
                    .or_else(|| insert_into_array(&app_text, "files", "\"oui.d.ts\""))
            {
                if fs::write(&app, &next).is_err() {
                    return TypesEdit::Manual(app);
                }
                written.push(app.clone());
                app_text = next;
            }
            if let Some(next) = merge_paths(&app_text, &paths) {
                if fs::write(&app, next).is_err() {
                    return TypesEdit::Manual(app);
                }
                written.push(app);
            }
        }
        written.dedup();
        return if written.is_empty() {
            TypesEdit::Already(dts)
        } else {
            TypesEdit::Written(written)
        };
    }

    // 非 references 分支：oui.d.ts 登记进 include（或 files；都无则 TS 默认包含根目录文件）
    let mut text = text;
    if !text.contains(TYPES_FILE)
        && let Some(next) = insert_into_array(&text, "include", "\"oui.d.ts\"")
            .or_else(|| insert_into_array(&text, "files", "\"oui.d.ts\""))
    {
        if fs::write(&main, &next).is_err() {
            return TypesEdit::Manual(main);
        }
        written.push(main.clone());
        text = next;
    }

    // 路径映射：有类型的包 → 本地 oui-types/<pkg>/index.d.ts（用户 tsconfig 只插不改）
    if let Some(next) = merge_paths(&text, &paths) {
        if fs::write(&main, next).is_err() {
            return TypesEdit::Manual(main);
        }
        if !written.contains(&main) {
            written.push(main);
        }
    }

    if written.is_empty() {
        TypesEdit::Already(dts)
    } else {
        TypesEdit::Written(written)
    }
}

/// 输出类型接入的处理结果。
fn report_types(edit: &TypesEdit) {
    match edit {
        TypesEdit::Written(files) => {
            let list: Vec<String> = files.iter().map(|p| p.display().to_string()).collect();
            println!("{}", list.join(","));
        }
        TypesEdit::Already(p) => println!("类型接入已就绪: {}", p.display()),
        TypesEdit::Manual(p) => {
            println!("需手动配置类型接入: {}", p.display());
        }
    }
}

/// 向上查找 oui.json 配置。
fn find_pkg_config_up(from: &Path) -> Option<(PathBuf, PkgConfigFile)> {
    let mut dir: Option<&std::path::Path> = Some(from);
    while let Some(d) = dir {
        if let Some(cfg) = read_pkg_config(d) {
            return Some((d.to_path_buf(), cfg));
        }
        dir = d.parent();
    }
    None
}

/// 解析发布令牌：flag > env OUI_TOKEN > 连接 token（项目 connection → 凭据；无则用凭据默认连接）。
fn resolve_publish_token(flag: &Option<String>, token_base: &Path) -> Option<String> {
    if let Some(t) = flag.clone() {
        return Some(t);
    }
    if let Ok(t) = std::env::var("OUI_TOKEN")
        && !t.is_empty()
    {
        return Some(t);
    }
    if let Some((_, conn)) = connection_named(project_connection_name(token_base).as_deref())
        && let Some(t) = conn.token.filter(|t| !t.is_empty())
    {
        return Some(t);
    }
    None
}

// ---------- publish ----------

#[derive(Deserialize)]
struct PkgManifest {
    name: String,
    version: String,
    entry: PkgEntry,
    #[serde(default)]
    source: Option<PkgSource>,
}

#[derive(Deserialize)]
struct PkgSource {
    #[serde(default)]
    files: Vec<String>,
}

#[derive(Deserialize)]
struct PkgEntry {
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
async fn upload_pkg(pkg_root: &Path, registry: &str, token: &str, allow_exists: bool) -> Result<()> {
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
///   --dir <d> —— d 为单个包目录（含 manifest.json）；或 d 为项目根（oui.json）；
///   无 --dir —— cwd：单个包目录（manifest.json）或项目根（oui.json）。
/// 项目根模式：发布 oui.json components 清单中（构建过）的所有组件。
async fn cmd_publish(dir_flag: Option<&str>, registry: &Option<String>, token: &Option<String>) -> Result<()> {
    let cwd = std::env::current_dir()?;
    // registry/token 的解析基准：--dir 目标目录；否则 cwd
    let token_base = match dir_flag {
        Some(d) => PathBuf::from(d),
        None => cwd.clone(),
    };
    let probe = |b: &PathBuf| -> (bool, Option<PkgConfigFile>) {
        (b.join("manifest.json").is_file(), read_pkg_config(b))
    };

    enum Target {
        Single(PathBuf),
        Project { root: PathBuf, cfg: PkgConfigFile },
    }
    let target = match dir_flag {
        Some(d) => {
            let b = PathBuf::from(d);
            let (is_single, cfg) = probe(&b);
            if is_single {
                Target::Single(b)
            } else if let Some(cfg) = cfg {
                Target::Project { root: b, cfg }
            } else {
                match project_root(&b) {
                    (root, Some(cfg)) if root != b => Target::Project { root, cfg },
                    _ => bail!("{d} 既没有 manifest.json，也不是含 {PKG_CONFIG} 的工程根"),
                }
            }
        }
        None => {
            let (is_single, _cfg) = probe(&cwd);
            if is_single {
                Target::Single(cwd)
            } else {
                match project_root(&cwd) {
                    (root, Some(cfg)) => Target::Project { root, cfg },
                    (_, None) => bail!("当前目录及上级均无 {PKG_CONFIG}，也没有 manifest.json——先 oui register 登记组件，或用 oui publish --dir <pkg 目录>"),
                }
            }
        }
    };

    // registry：flag > env OUI_REGISTRY > 连接（--dir/cwd 所在的 oui.json）> 内置默认
    let registry = registry_url_from(registry, &token_base);

    // token：--token > env OUI_TOKEN > 连接 token > 报错
    let token = resolve_publish_token(token, &token_base)
        .ok_or_else(|| anyhow!("缺少发布令牌：请用 --token 或环境变量 OUI_TOKEN"))?;

    match target {
        Target::Single(root) => upload_pkg(&root, &registry, &token, false).await,
        Target::Project { root, cfg } => {
            if cfg.components.is_empty() {
                bail!("oui.json 的 components 为空；请先用 `oui register` 登记组件")
            }
            for c in &cfg.components {
                let pkg_root = cfg.component_pkg_dir(c);
                let abs = if pkg_root.is_absolute() { pkg_root } else { root.join(&pkg_root) };
                println!("[oui] 发布组件 {}@{} → {}", c.name, c.version, abs.display());
                upload_pkg(&abs, &registry, &token, true).await?;
            }
            Ok(())
        }
    }
}

fn build_tar_gz(files: &[(String, PathBuf)]) -> Result<Vec<u8>> {
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

// ---------- use ----------

/// 解析包规格：@scope/name 或 @scope/name@version → (base, 期望版本)。
fn split_pkg_spec(pkg: &str) -> Result<(String, Option<String>)> {
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

async fn cmd_use(pkg: &str, registry: &Option<String>, mode: &str, with_types: bool) -> Result<()> {
    match mode {
        "remote" => cmd_use_remote(pkg, registry, with_types).await,
        "source" => cmd_use_source(pkg, registry).await,
        other => bail!("不支持的 mode: {other}（remote | source）"),
    }
}

async fn cmd_use_remote(pkg: &str, registry: &Option<String>, with_types: bool) -> Result<()> {
    let (base, want_version) = split_pkg_spec(pkg)?;

    let reg = registry_url(registry);
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
    // 只取相对信息：实际 URL 由使用方按「连接/OUI_REGISTRY」拼出（lock 因此可跨环境提交）
    let module_rel = body["entry"]["module"]
        .as_str()
        .ok_or_else(|| anyhow!("resolve 响应缺少 entry.module"))?
        .to_string();
    let css_rels: Vec<String> = body["entry"]["css"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    // lock 写到工程根（配置所在目录；无配置取最近含 package.json 的祖先），文件名取 lockFile
    let cwd = std::env::current_dir()?;
    let (root, found) = project_root(&cwd);

    // 类型声明（可选）：从 resolve 的 entry.types/typesFiles 下载到 oui-types/<name>/<version>/
    let types_entry = body["entry"]["types"].as_str().map(str::to_string);
    let types_files: Vec<String> = body["entry"]["typesFiles"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    let mut local_types: Option<Value> = None;
    if let (Some(entry), false) = (&types_entry, types_files.is_empty()) {
        match fetch_pkg_types(&client, &reg, &base, &version, entry, &types_files, &root).await {
            Ok(files) => {
                println!("已落盘 {base}@{version} 的类型声明（{} 个文件）", files.len());
                local_types = Some(json!({
                    "entry": format!("{TYPES_DIR}/{base}/index.d.ts"),
                    "files": files,
                }));
            }
            Err(e) => println!("{base}@{version} 类型声明落盘失败：{e}"),
        }
    } else {
        println!("{base}@{version} 未提供类型声明（lock 已登记，消费端按 any 处理）");
    }

    let lock_name = found
        .map(|c| c.lock_file_name())
        .unwrap_or_else(|| LOCK_FILE.to_string());
    let lock_path = root.join(&lock_name);
    let mut lock: Value = if lock_path.is_file() {
        serde_json::from_slice(&fs::read(&lock_path)?).unwrap_or(json!({}))
    } else {
        json!({})
    };
    // lock 只记连接名（凭据在 ~/.oui/credentials.json），便于把 lock 提交进仓库
    let conn_name = project_connection_name(&cwd)
        .or_else(|| read_cred().default)
        .unwrap_or_else(|| DEFAULT_CONNECTION.to_string());
    lock.as_object_mut().map(|o| o.remove("registry"));
    lock["connection"] = json!(conn_name);
    if !lock.get("packages").and_then(Value::as_object).is_some() {
        lock["packages"] = json!({});
    }
    let packages = lock["packages"].as_object_mut().ok_or_else(|| anyhow!("lock 文件结构异常: packages 应为对象"))?;
    let mut entry = json!({ "version": version, "module": module_rel, "css": css_rels });
    if let Some(t) = &local_types {
        entry["types"] = t.clone();
    }
    packages.insert(base.clone(), entry);
    let out = serde_json::to_string_pretty(&lock)?;
    fs::write(&lock_path, format!("{out}\n"))?;

    println!("已锁定 {base}@{version} → {lock_name}");
    register_use(&root, &base, &version, "remote")?;
    println!("已登记使用依赖 {base}@{version}（mode=remote）→ {PKG_CONFIG} 的 uses[]");
    // 有类型就接（tsconfig paths 指向 oui-types/<pkg>/index.d.ts）；无类型时保持通配 any
    if with_types || !type_paths_of(&lock).is_empty() {
        report_types(&configure_types(&root));
    } else if !has_remote_types(&root) {
        println!("已登记 {base}@{version} 并更新 tsconfig");
    }
    println!("构建期接入：安装 @openui_hub/plugin_vite 并在 vite.config 添加 hubVite()；代码中 import {{ Button }} from 'oui-hub:{base}'");
    Ok(())
}

/// source 模式：把包的源码文件复制到 <cwd>/src/components/oui/<slug>/（按 basename 平铺）。
async fn cmd_use_source(pkg: &str, registry: &Option<String>) -> Result<()> {
    let (base, want_version) = split_pkg_spec(pkg)?;
    let reg = registry_url(registry);
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
    register_use(&root, &base, &version, "source")?;
    println!("已登记使用依赖 {base}@{version}（mode=source）→ {PKG_CONFIG} 的 uses[]");
    if css_strategy != "vanilla" {
        println!("提示：该包 cssStrategy={css_strategy}，原子类策略需接入工程配置 UnoCSS");
    }
    println!("接入：在 src/components/oui/{slug}/index.ts（如有）导出；注意源码为按文件名的平铺布局");
    Ok(())
}

// ---------- list ----------

async fn cmd_list(registry: &Option<String>) -> Result<()> {
    let reg = registry_url(registry);
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
        println!("hub 上暂无包");
        return Ok(());
    }
    for p in pkgs {
        let scope = p["scope"].as_str().unwrap_or("");
        let name = p["name"].as_str().unwrap_or("");
        let latest = p["latest"].as_str().unwrap_or("-");
        println!("{scope}/{name}\t{latest}");
    }
    Ok(())
}
