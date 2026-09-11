# dp_ui monorepo

基于 **reka-ui + UnoCSS** 的 Vue 组件库 monorepo（pnpm workspace），核心组件库为 `@dp_ui/core`。

## 包结构

| 包                    | 说明                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`       | `@dp_ui/core` 核心组件库（page → panel → component，功能分类组件，全量/按需加载）                                                                       |
| `packages/chat`       | `@dp_ui/chat` AI 对话界面组件库（Dpc* 前缀，独立 `--dpc-*` 令牌）                                                                                       |
| `packages/schema`     | @dp_ui/schema 数据驱动编排层（schema 元数据决定结构/样式，绑定数据 + dataSource 驱动交互；渲染目标为 @dp_ui/core 组件，见 `packages/schema/DESIGN.md`） |
| `packages/playground` | 演示应用（验证全量与按需接入、@dp_ui/schema 数据驱动演示 `/schema-demo`）                                                                               |

## 常用命令（根目录执行）

```sh
pnpm install                       # 安装全部 workspace 依赖
pnpm build:lib                     # 构建 @dp_ui/core（dist/）
pnpm type-check                    # @dp_ui/core 类型检查
pnpm test:unit                     # @dp_ui/core 单元测试
pnpm lint                          # @dp_ui/core lint
pnpm dev:web                       # 启动演示应用（http://localhost:5173）
# @dp_ui/schema（数据驱动层）
pnpm type-check:schema             # @dp_ui/schema 类型检查
pnpm test:schema                   # @dp_ui/schema 单元测试
pnpm lint:schema                   # @dp_ui/schema lint
# @dp_ui/chat（对话组件库）
pnpm type-check:chat               # @dp_ui/chat 类型检查
pnpm test:chat                     # @dp_ui/chat 单元测试
pnpm lint:chat                     # @dp_ui/chat lint
pnpm build:chat                    # 构建 @dp_ui/chat（dist/）
```

## 文档

- 设计文档：`docs/DESIGN.md`（@dp_ui/core）
- 数据驱动层设计说明：`packages/schema/DESIGN.md`
- 核心组件库说明：`packages/core/README.md`
