//! oui —— openui_hub 本地终端工具（发布端 + 消费端）。

use anyhow::Result;
use clap::{Parser, Subcommand};

mod ask;
mod cmd;
mod config;
mod cred;
mod decl;
mod style;
mod text;
mod types;
mod vscode;

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
        /// hub 地址（flag > env OUI_REGISTRY > 凭据默认连接 > 默认 127.0.0.1:8787）
        #[arg(long)]
        registry: Option<String>,
        /// 发布令牌（优先于 env OUI_TOKEN）
        #[arg(long)]
        token: Option<String>,
    },
    /// 解析并锁定组件版本，写入 oui.lock.json（oui.json 的 lockFile 可改名）
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
    /// 在本目录初始化 oui.json（CLI 配置与公共默认值），并开启 .vscode file nesting
    /// （把 oui.d.ts / oui.lock.json / oui.components.json 折叠进 oui.json）
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
        /// 启用 UnoCSS 原子类支持（写入顶层 uno；未给时继承现有值）
        #[arg(long)]
        uno: bool,
        /// 使用者锁文件名（写入顶层 lockFile），默认 oui.lock.json
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
    /// 并把 oui 相关文件折叠进工程配置（VS Code file nesting）
    Fix {
        /// hub 地址（flag > env OUI_REGISTRY > 凭据默认连接 > 默认）
        #[arg(long)]
        registry: Option<String>,
    },
    /// 创建组件模板：入口 index.ts（默认导出 hub 组件描述对象 + 具名导出组件本体）
    /// 与同名 SFC，并登记到 oui.components.json（发布侧）
    #[command(
        after_help = "结构：<dir>/index.ts（默认导出 { name, title, description, meta, component }）+ <dir>/<Slug>.vue\n示例：oui create @oui/card --description \"卡片容器\"\n后续：构建工程（如 pnpm build）→ `oui publish`"
    )]
    Create {
        /// 组件名，形如 @scope/name
        pkg: String,
        /// 组件目录（相对工程根；默认 src/ui/<slug>）
        #[arg(long)]
        dir: Option<String>,
        /// 版本 x.y.z（省略则沿用已登记值、工程 package.json 或 0.1.0）
        #[arg(long)]
        version: Option<String>,
        /// 展示标题（省略则用组件名末段的 PascalCase）
        #[arg(long)]
        title: Option<String>,
        /// 组件描述（写入模板与该组件的 components 条目）
        #[arg(long)]
        description: Option<String>,
        /// 组件类型（默认继承 oui.json；目前仅支持 vue-component）
        #[arg(long)]
        r#type: Option<String>,
        /// 样式策略（默认继承 oui.json；非 vanilla 时模板用原子类）
        #[arg(long)]
        css_strategy: Option<String>,
        /// 组件源码使用 UnoCSS 原子类（默认继承 oui.json 的 uno）
        #[arg(long)]
        uno: bool,
        /// 显式关闭原子类（覆盖 oui.json 的 uno）
        #[arg(long = "no-uno")]
        no_uno: bool,
        /// 该组件发布到的 hub 地址（省略则沿用已登记值；交互模式下询问）
        #[arg(long)]
        registry: Option<String>,
        /// 只生成模板文件，不登记到 oui.components.json
        #[arg(long)]
        no_register: bool,
        /// 目录已存在时覆盖已生成的两个文件
        #[arg(long)]
        force: bool,
        /// 不进入交互询问（缺项取继承值/默认值；供 CI 使用）
        #[arg(long)]
        no_input: bool,
    },
    /// 登记/更新待发布组件到 oui.components.json 的 components[]（发布侧；与 use 对称）
    Register {
        /// 组件名，形如 @scope/name
        pkg: String,
        /// 版本 x.y.z（省略则交互式询问/沿用已登记值）
        #[arg(long)]
        version: Option<String>,
        /// 组件源入口（相对工程根），如 src/ui/button/index.ts
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
        /// 该组件发布到的 hub 地址（省略则交互询问；候选来自凭据中的连接）
        #[arg(long)]
        registry: Option<String>,
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

#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        style::eout(style::error(format!("{e:#}")));
        std::process::exit(1);
    }
}

async fn run() -> Result<()> {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Hub { cmd } => match cmd {
            HubCmd::Add { name, registry, token, no_input } =>
                cmd::auth::cmd_hub_add(name.as_deref(), registry.as_deref(), token.as_deref(), no_input),
            HubCmd::Delete { name } => cmd::auth::cmd_hub_delete(&name),
            HubCmd::List => cmd::auth::cmd_hub_list(),
        },
        Cmd::Publish { dir, registry, token } => {
            cmd::publish::cmd_publish(dir.as_deref(), &registry, &token).await
        }
        Cmd::Use { pkg, registry, mode, with_types } => {
            cmd::consume::cmd_use(&pkg, &registry, &mode, with_types).await
        }
        Cmd::List { registry } => cmd::list::cmd_list(&registry).await,
        Cmd::Fix { registry } => cmd::fix::cmd_fix(&registry).await,
        Cmd::Login { name, registry, token, no_input } => {
            cmd::auth::cmd_login(name.as_deref(), registry.as_deref(), token.as_deref(), no_input)
        }
        Cmd::Manifest { dir, name, version, description, r#type, css_strategy, module, css, peer } => {
            cmd::manifest::cmd_manifest(&dir, name.as_deref(), version.as_deref(), description.as_deref(), &r#type, &css_strategy, module.as_deref(), &css, &peer)
        }
        Cmd::Init { dist, r#type, css_strategy, uno, lock_file, tsconfig, yes } => {
            cmd::init::cmd_init(cmd::init::InitArgs { dist, kind: r#type, css_strategy, uno, lock_file, tsconfig, yes })
        }
        Cmd::Register { pkg, version, entry, source, description, r#type, css_strategy, out_dir, types, registry, no_input } => {
            cmd::register::cmd_register(cmd::register::RegisterArgs {
                pkg, version, entry, source, description,
                kind: r#type, css_strategy, out_dir, types, registry, no_input,
            })
        }
        Cmd::Create { pkg, dir, version, title, description, r#type, css_strategy, uno, no_uno, registry, no_register, force, no_input } => {
            cmd::create::cmd_create(cmd::create::CreateArgs {
                pkg, dir, version, title, description,
                kind: r#type, css_strategy, uno, no_uno, registry, no_register, force, no_input,
            })
        }
    }
}
