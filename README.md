# openui_hub

组件包枢纽（hub）monorepo（pnpm workspace）：各 workspace 包负责组件包的构建、发布、分发与远程加载。

## 包结构

| 包                           | 说明                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `packages/registry` | 官方组件真源：样例组件构建为可发布包（manifest + dist）              |
| `packages/server`   | 托管服务端（Rust/axum）：publish / 分发 / manifest 校验              |
| `packages/cli`      | `dpui` 本地终端工具（Rust）：npm 单包安装后提供 `dpui` 命令          |
| `packages/plugin_vite`     | Vite 插件：构建期远程组件接入（`dpui-hub:@scope/name`）              |
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
pnpm hub:build:cli                 # cargo build --release（dpui CLI）
pnpm hub:build:server              # cargo build --release（hub 服务端）
pnpm hub:build:vite                # 构建 Vite 插件
pnpm hub:build:runtime             # 构建运行时 loader
pnpm hub:build:cli:platforms       # 归集当前平台 dpui 二进制到单包 vendor/<os>-<arch>/
pnpm hub:test                      # server / vite / runtime 单元测试
pnpm hub:test:cli-install          # npm 安装冒烟（pack → install → `dpui --help`）
pnpm hub:e2e                       # 端到端：registry → server → publish → 分发 → 远程加载
pnpm hub:use-cli                   # 经 workspace 依赖执行 `dpui --help`
pnpm hub:dev:web                   # 启动平台前端（http://localhost:5173）
```

平台前端（`packages/web`）自带 UnoCSS 配置与基础 reset，仓库内只依赖 `@openui_hub/runtime`；
远程组件预览要求 `hub_server` 已启动（浏览器直连，不做 dev proxy）。

```sh
pnpm --filter @openui_hub/web build        # 平台前端产物（dist/）
pnpm --filter @openui_hub/web type-check   # 平台前端类型检查
```
