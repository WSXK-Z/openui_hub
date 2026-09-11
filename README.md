# openui_hub

组件包枢纽（hub）monorepo（pnpm workspace）：各 workspace 包负责组件包的构建、发布、分发与远程加载。

## 包结构

| 包                           | 说明                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `packages/registry` | 官方组件真源：样例组件构建为可发布包（manifest + dist）              |
| `packages/server`   | 托管服务端（Rust/axum）：publish / 分发 / manifest 校验              |
| `packages/cli`      | `oui` 本地终端工具（Rust）：npm 单包安装后提供 `oui` 命令            |
| `packages/plugin_vite`     | Vite 插件：构建期远程组件接入（`oui-hub:@scope/name`）              |
| `packages/runtime`  | 运行时远程加载：loader + `HubRemote` Vue 组件                        |
| `packages/web`      | 平台使用端（组件瀑布流卡片 + 远程渲染预览，管理员可删除/发布）       |
| `packages/example`  | 独立示例工程（使用者视角，验证构建期插件通道）                       |

## 常用命令（根目录执行）

```sh
pnpm install                       # 安装全部 workspace 依赖
```

### hub：构建 / 发布 / 分发

```sh
pnpm hub:build                     # 依次构建 registry / cli / server / vite / runtime
pnpm hub:build:registry            # 构建官方组件包（manifest + dist）
pnpm hub:build:cli                 # cargo build --release（oui CLI）
pnpm hub:build:server              # cargo build --release（hub 服务端）
pnpm hub:build:vite                # 构建 Vite 插件
pnpm hub:build:runtime             # 构建运行时 loader
pnpm hub:build:cli:platforms       # 归集当前平台 oui 二进制到单包 vendor/<os>-<arch>/
pnpm hub:test                      # server / vite / runtime 单元测试
pnpm hub:test:cli-install          # npm 安装冒烟（pack → install → `oui --help`）
pnpm hub:e2e                       # 端到端：registry → server → publish → 分发 → 远程加载
pnpm hub:use-cli                   # 经 workspace 依赖执行 `oui --help`
pnpm hub:dev:web                   # 启动平台前端（http://localhost:5173）
```

### Hub 连接与项目配置

连接是用户级持久化对象（hub 地址 + 令牌），可独立于项目管理：

```sh
oui hub add --name default --registry http://127.0.0.1:8787 --token <token>
oui hub list
oui hub delete default
oui init
```

工程内三份配置各司其职（同一目录）：

| 文件 | 用途 |
| --- | --- |
| `oui.json` | CLI 在当前目录的配置与公共默认值（`type` / `cssStrategy` / `outDir` / `uno` / `peer` / `lockFile`） |
| `oui.components.json` | 组件开发者：哪些组件纳入 hub，每个组件记录发布到的 hub 地址（`registry`） |
| `oui.lock.json` | 组件使用者：锁定使用的远程组件（每个包只记 `version` + 来源 hub 地址 `registry`，产物路径/样式/类型由该版本的 manifest 决定） |

`oui init` 生成 `oui.json`（不录入凭据）；`oui create <@scope/name>` 生成组件模板并登记；
`oui register <@scope/name>` 登记已有组件并询问发布到哪个 hub；
`oui use <@scope/name>` 询问从哪个 hub 获取，并把地址写进 `oui.lock.json` 的对应条目。
发布/拉取都按各条目自带的地址进行，构建期可用 `OUI_REGISTRY` 临时改指向。

### 组件入口契约（`oui create` 生成的模板）

组件入口固定为组件目录下的 `index.ts`，默认导出**组件描述对象**：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 包名 `@scope/name`，与 `oui.components.json` 一致 |
| `title` | 否 | 展示标题（缺省取组件名末段的 PascalCase） |
| `description` | 否 | 展示用描述 |
| `meta` | 否 | 自由元数据（平台扩展位，hub 不解析） |
| `component` | 是 | 组件本体（SFC 的 default 或 `defineComponent(...)` 返回值） |

同时**具名导出组件本体**：构建期 `import { Button } from 'oui-hub:@oui/button'` 拿组件，
`import desc from 'oui-hub:@oui/button'` 拿描述对象；运行时 `loadRemote` / `<HubRemote>` /
平台预览统一取 `mod.default.component`。组件只应依赖 peer 声明的依赖与自身目录内文件。

```sh
oui create @oui/card --description "卡片容器"   # → src/ui/card/index.ts + src/ui/card/Card.vue
```

`--dir` 改目录、`--version`/`--title`/`--description`/`--registry` 给定值、
`--no-register` 只生成文件不登记、`--force` 覆盖非空目录、`--no-input` 全程不询问。
`version` / `type` / `cssStrategy` / `peer` / `types` 不进描述对象，统一由 `oui.components.json`
与构建产物 manifest 承载。

平台前端（`packages/web`）自带 UnoCSS 配置与基础 reset，仓库内只依赖 `@openui_hub/runtime`；
远程组件预览要求 `hub_server` 已启动（浏览器直连，不做 dev proxy）。

```sh
pnpm --filter @openui_hub/web build        # 平台前端产物（dist/）
pnpm --filter @openui_hub/web type-check   # 平台前端类型检查
```
