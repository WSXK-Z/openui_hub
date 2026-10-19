# dp_ui Code Wiki

> 基于 **reka-ui + UnoCSS + Vue 3.5 + TypeScript + Vite 8** 的 pnpm monorepo。
> 本文档由对仓库源码的分析生成，覆盖项目整体架构、主要模块职责、关键类与函数说明、依赖关系以及项目运行方式。

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [Monorepo 包结构](#3-monorepo-包结构)
4. [@dp_ui/core — 核心组件库](#4-dp_uicore--核心组件库)
5. [@dp_ui/schema — 数据驱动编排层](#5-dp_uischemal--数据驱动编排层)
6. [@dp_ui/chat — AI 对话界面组件库](#6-dp_uichatal--ai-对话界面组件库)
7. [@dp_ui/video-rtc — 视频播放器组件](#7-dp_uivideo-rtc--视频播放器组件)
8. [dpui_hub — 组件分发系统](#8-dpui_hub--组件分发系统)
9. [playground — 演示应用](#9-playground--演示应用)
10. [依赖关系总览](#10-依赖关系总览)
11. [项目运行方式](#11-项目运行方式)
12. [代码规范与测试](#12-代码规范与测试)
13. [CI/CD 与发布](#13-cicd-与发布)

---

## 1. 项目概述

`dp_ui` 是一个企业级 Vue 组件库 monorepo，技术栈为：

| 类别 | 选型 | 用途 |
| --- | --- | --- |
| 框架 | Vue 3.5 | `<script setup>` + Composition API |
| 语言 | TypeScript ~7.0 | 全量类型推导，`vue-tsc` 校验 |
| 底层原语 | reka-ui ^2.10 | 无样式组件原语 |
| 样式 | UnoCSS ^66 | 原子化 CSS + 设计令牌 |
| 构建 | Vite ^8（库模式） | 多入口打包 |
| 路由 | vue-router ^5 | page 层路由组件 |
| 测试 | Vitest + Playwright | 单元 / E2E |
| 代码质量 | oxlint + oxfmt | lint / format |
| 包管理 | pnpm workspace | monorepo |

**核心设计理念**：

1. **page → panel → component 三层界面组织范式**：路由集中在 page，功能划分落到 panel，基础能力收敛到 component。
2. **UI 组件 / 行为组件 二元划分**：UI 组件负责视觉与交互呈现，行为组件负责逻辑控制（权限、上下文注入、懒加载等）。
3. **数据驱动编排层（@dp_ui/schema）**：通过 schema 元数据决定结构/样式，绑定数据 + dataSource 驱动交互，渲染目标为 @dp_ui/core 组件。
4. **不引入第三方组件库**：除 reka-ui 与 UnoCSS 外不依赖任何组件库；不使用 CSS 预处理器。
5. **全量 + 按需双模式**：支持 `app.use(DpUi)` 全量注册与具名导入 tree-shaking 按需加载。

设计文档：[docs/DESIGN.md](file:///d:/projects/hs/codes/dp/dp_ui/docs/DESIGN.md)

---

## 2. 整体架构

### 2.1 三层结构：page → panel → component

```
┌─────────────────────────────────────────────┐
│ Page 层 · 根路由容器                          │
│ DpPage + 布局模板(DpLayoutBasic/Sider)       │
│ 职责：路由集中处理、界面整体结构布局           │
├─────────────────────────────────────────────┤
│ Panel 层 · 功能划分                           │
│ DpPanel                                      │
│ 职责：页面功能区块划分、面板级上下文注入       │
├─────────────────────────────────────────────┤
│ Component 层 · 基础组件                       │
│ UI 组件(DpButton/DpInput/DpTable…)           │
│ 行为组件(DpAuth/DpProvide/DpLazy…)           │
└─────────────────────────────────────────────┘
```

### 2.2 组件二维分类

所有基础组件按「是否直接渲染视觉内容」分为两类：

- **UI 组件**：有可见 DOM 输出、有视觉与交互语义（8 类：通用/布局/导航/数据录入/数据展示/反馈）
- **行为组件**：渲染为透明 `<template>`/`<slot>` 或不渲染 DOM，只提供逻辑能力（工具类/配置类）

### 2.3 上下文数据流转

```
vue-router → DpPage(provide PageContext)
           → DpPanel(provide PanelContext)
           → DpConfigProvider / useTheme(options)(provide ThemeContext)
           → DpAuth(provide AuthContext) / DpProvide(provide 任意 key)
           → UI/行为组件(inject 消费)
```

使用方的 Pinia store 在 page 层接入，库本身不内置状态管理方案。

### 2.4 数据驱动渲染管线（@dp_ui/schema）

```
DsNode(schema) → DsSchema(根：provide 上下文)
              → DsNode(递归：visible 判断、字段布局、容器 children)
              → DsControl(控件：registry 解析、theme/comp 映射、field 绑定、dataSource 注入)
              → @dp_ui/core 组件(DpInput/DpSelect…)
```

---

## 3. Monorepo 包结构

仓库根 [package.json](file:///d:/projects/hs/codes/dp/dp_ui/package.json) 通过 [pnpm-workspace.yaml](file:///d:/projects/hs/codes/dp/dp_ui/pnpm-workspace.yaml) 声明 `packages/*` 为 workspace 包。

| 包 | 路径 | 职责 |
| --- | --- | --- |
| `@dp_ui/core` | [packages/core](file:///d:/projects/hs/codes/dp/dp_ui/packages/core) | 核心页面级组件库（page → panel → component） |
| `@dp_ui/schema` | [packages/schema](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema) | 数据驱动 UI 编排/渲染层 |
| `@dp_ui/chat` | [packages/chat](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat) | AI 对话界面组件库（Dpc* 前缀） |
| `@dp_ui/video-rtc` | [packages/VideoRTC](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC) | go2rtc 视频播放器（WebRTC/MSE/HLS/MJPEG） |
| `dp-ui-playground` | [packages/playground](file:///d:/projects/hs/codes/dp/dp_ui/packages/playground) | 演示应用（全量/按需接入验证） |
| `@dp_ui/hub_registry` | [packages/dpui_hub_registry](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry) | hub 官方组件真源（样例可发布包） |
| `@dp_ui/hub_example` | [packages/dpui_hub_example](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_example) | hub 远程组件消费示例工程 |
| `@dp_ui/hub_cli` | [packages/dpui_hub_cli](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_cli) | Rust 终端工具 `dpui`（publish/use/list） |
| `@dp_ui/hub_server` | [packages/dpui_hub_server](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server) | Rust 组件分发服务器（axum） |
| `@dp_ui/hub_vite` | [packages/dpui_hub_vite](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_vite) | Vite 插件（构建期远程组件加载 + 组件打包） |
| `@dp_ui/hub_runtime` | [packages/dpui_hub_runtime](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_runtime) | 运行时远程组件加载（HubRemote 组件 + loader） |

根 [package.json](file:///d:/projects/hs/codes/dp/dp_ui/package.json) 提供统一脚本入口（见 [§11 运行方式](#11-项目运行方式)）。

---

## 4. @dp_ui/core — 核心组件库

**入口**：[packages/core/src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/index.ts)
**包配置**：[packages/core/package.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/package.json)

### 4.1 主入口

[src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/index.ts) 做三件事：

1. 导入 `uno.css` + 全局样式（构建期生成 `dist/style.css`）
2. 聚合所有组件为 `DpUi` 插件（`createInstaller(components, { auth: vAuth })`），供 `app.use(DpUi)` 全量注册
3. 具名导出全部模块（`components` / `page` / `panel` / `directives` / `composables` / `tokens` / `types` / `utils`），支持 tree-shaking 按需加载

### 4.2 统一 Props 模型：theme + comp

所有组件遵循 `{ theme?: DpThemeProps; comp?: Partial<Comp> }` 契约：

- **theme**：外观数据（class/style/size/variant/round/ghost/icon/block/bordered/cssVars），只影响外观
- **comp**：组件业务数据（如 DpButton 的 loading/disabled/nativeType），可部分传入，缺失项由组件默认值补齐
- 原生 `style`/`class` 不进 props，直接透传到根元素

类型定义见 [src/types/dp-props.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/types/dp-props.ts)：

```ts
export interface DpThemeProps {
  class?: ClassValue
  style?: StyleValue
  size?: DpSize        // 'small' | 'medium' | 'large'
  variant?: DpType     // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  round?: boolean
  ghost?: boolean
  icon?: boolean
  block?: boolean
  bordered?: boolean
  cssVars?: Record<string, string | number>  // key 省略 --dp- 前缀自动补齐
}

export type DpProps<Comp extends object = object> = {
  theme?: DpThemeProps
  comp?: Partial<Comp>
}
```

公共类型见 [src/types/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/types/index.ts)：`DpSize`、`DpType`、`DpBooleanish`。

### 4.3 核心 composable：useDpProps

[src/composables/useDpProps.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/composables/useDpProps.ts)

```ts
function useDpProps<Comp extends object>(
  props: DpProps<Comp>,
  options?: { compDefaults?: Partial<Comp>; themeDefaults?: Partial<DpThemeProps> }
): UseDpPropsReturn<Comp>
```

**职责**：

- 合并 `comp` 默认值与用户传入值，返回响应式 `comp`
- 解析 `theme` 为 `ResolvedDpStyle`（size/variant/round/ghost/icon/block/bordered/cssVars，优先级：用户传入 > themeDefaults > 内置默认）
- 合并透传 attrs + theme 的 class/style/cssVars 为 `rootAttrs`，组件在根元素 `v-bind="rootAttrs"` 即可自动应用
- `normalizeCssVars()`：key 省略 `--dp-` 前缀时自动补齐

**返回**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `comp` | `ComputedRef<Comp>` | 合并默认值后的业务数据 |
| `style` | `ComputedRef<ResolvedDpStyle>` | 合并默认值后的外观数据 |
| `rootAttrs` | `ComputedRef<Record<string, unknown>>` | 绑定到根元素的属性 |

组件需设置 `defineOptions({ inheritAttrs: false })` 避免自动透传重复。

### 4.4 Page 层

| 文件 | 说明 |
| --- | --- |
| [src/page/DpPage.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/DpPage.vue) | 页面容器（路由组件），读取 route.meta.title，provide PageContext 与 Panel Group 上下文，渲染面板停靠位 |
| [src/page/pageContext.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/pageContext.ts) | 页面级 provide/inject（`pageContextKey`、`providePageContext`、`usePage`） |
| [src/page/layouts/DpLayoutBasic.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/layouts/DpLayoutBasic.vue) | 基础布局（header/main/footer） |
| [src/page/layouts/DpLayoutSider.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/layouts/DpLayoutSider.vue) | 侧边栏布局（sider/header/main） |
| [src/page/layouts/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/layouts/index.ts) | 导出 DpLayoutBasic、DpLayoutSider（withInstall 包装） |
| [src/page/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/index.ts) | Page 层聚合导出 |

**DpPage 关键逻辑**（[src/page/DpPage.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/page/DpPage.vue)）：

```ts
const route = useRoute()
const title = computed(() => c.value.title || (route.meta.title as string | undefined) || '')
providePageContext({ title: title.value, meta: route.meta })
provideDpPanelGroupContext({ registerPanel, unregisterPanel, getPanels, getPanel, bringToFront, persist })
defineExpose({ getPanels, getPanel, bringToFront, getAnchor })
```

- `comp.anchors` 控制渲染的停靠位（默认 7 个：四角 + 上中/下中 + 居中），`comp.anchorGap` 控制与页面边缘的间距。
- 通过 Panel Group 上下文注册面板；模板 ref 可调用 `getPanels()` / `getPanel(name)` / `bringToFront(name)` / `getAnchor(anchor)`。
- `comp.persistNamespace` / `comp.persistStorage` 提供面板状态持久化命名空间与存储实现（默认 localStorage）。

### 4.5 Panel 层

| 文件 | 说明 |
| --- | --- |
| [src/panel/DpPanel.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/panel/DpPanel.vue) | 功能面板容器，支持普通分区与浮动面板 |
| [src/panel/panelContext.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/panel/panelContext.ts) | 面板级上下文 + Panel Group 上下文与类型 |
| [src/panel/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/panel/index.ts) | 导出 DpPanel 与相关类型 |

**DpPanelComp**（[src/panel/DpPanel.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/panel/DpPanel.vue)）：

```ts
interface DpPanelComp {
  title: string
  collapsible: boolean
  defaultCollapsed: boolean
  size: 'small' | 'default' | 'wide'
  loading: boolean
  name: string          // 供 DpPage 查找 / 置顶
  anchor: DpPanelAnchor // 浮动模式停靠位
  fixed: boolean        // 脱离文档流并锚定
  movable: boolean      // 拖动标题栏移动
  resizable: boolean    // 右下角调整尺寸
  offset: [number, number]
  width: number
  height: number
  persist: string       // 持久化键名
  showTools: boolean    // 工具条（折叠 / 重置 / 置顶）
}
```

**关键逻辑**：

- 模块级 `panelSeq` 生成唯一 id（`dp-panel-N`），provide PanelContext，并向 DpPage 的 Panel Group 注册句柄。
- 普通模式保持原有分区行为：标题、折叠、尺寸、loading 遮罩。
- `fixed || movable || resizable` 进入浮动模式：按 `anchor` 绝对定位，偏移写入 CSS 变量，尺寸取 `width/height`。
- 拖动标题栏更新 `offset`；拖拽右下角更新尺寸（最小 180×120）；`pointerdown` 时向页面申请更高 z-index。
- `comp.persist` + DpPage 的 `persistNamespace` 组成存储键，防抖写入 `{ offset, width, height, collapsed }`，挂载时恢复。
- 模板 ref 暴露 `reset / collapse / expand / bringToFront / setOffset / setSize / getRect`。
- `tools` 插槽接收 `{ offset, size, collapsed, collapse, expand, reset, bringToFront }`，可自定义工具条。

### 4.6 Component 层

组件按功能分类，每类一个 index.ts 聚合，见 [src/components/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/index.ts)：

| 分类 | 目录 | 已实现组件 |
| --- | --- | --- |
| 通用 common | [src/components/common](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/common) | DpAvatar、DpButton、DpCard、DpAccordion、DpDivider、DpIcon、DpTag |
| 数据录入 data-entry | [src/components/data-entry](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/data-entry) | DpCheckbox、DpInput、DpInputNumber、DpRadio、DpSelect、DpSlider、DpSwitch、DpTagsInput、DpTextarea、DpToggle |
| 数据展示 data-display | [src/components/data-display](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/data-display) | DpEmpty、DpTable |
| 导航 navigation | [src/components/navigation](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/navigation) | DpBreadcrumb、DpPagination、DpSteps、DpTabs |
| 反馈 feedback | [src/components/feedback](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/feedback) | DpAlert、DpBadge、DpModal、DpPopover、DpProgress、DpSkeleton、DpSpin、DpTooltip |
| 布局 layout | [src/components/layout](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/layout) | DpFlex、DpGrid、DpSpace |
| 权限 auth | [src/components/auth](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/auth) | DpAuth（行为组件） |
| 上下文注入 provide | [src/components/provide](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/provide) | DpProvide、useInject（行为组件） |
| 懒加载 lazy | [src/components/lazy](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/lazy) | DpLazy（行为组件） |
| 配置 config | [src/components/config](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/config) | DpConfigProvider（行为组件） |
| 主题 theme | [src/theme](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/theme) | DpThemeProvider、DpThemeSwitch、DpThemeToggle、useTheme / createThemeController |

每类由目录内 `index.ts` 聚合；分类元数据见 [src/components/categories.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/categories.ts)（`dpComponentCategories` / `findComponentCategory`），安装顺序、文档目录与之一致。

每个组件目录内聚「组件 .vue + index.ts（withInstall 包装）+ __tests__/」。

#### DpButton 示例

[src/components/common/button/DpButton.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/common/button/DpButton.vue)

```ts
interface DpButtonComp {
  loading: boolean
  disabled: boolean
  nativeType: 'button' | 'submit' | 'reset'
}
```

- 颜色/尺寸以 `--dp-*` CSS 变量表达，外部可覆盖
- `FILLED_CLASSES` / `GHOST_CLASSES` / `DASHED_CLASSES` / `TEXT_CLASSES` / `QUATERNARY_CLASSES`：按 variant 与形态映射原子类
- `theme.text / dashed / quaternary / circle / strong` 在通用外观之上叠加 Naive UI 风格形态
- `SIZE_CLASSES` / `SIZE_VAR`：按 size 映射高度/内边距；icon 模式下取方形
- loading 时显示旋转 spinner 并禁用点击

#### DpAuth（权限控制，行为组件）

[src/components/auth/DpAuth.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/auth/DpAuth.vue)

```ts
interface DpAuthComp { code: string }  // 权限码，空表示始终允许
```

- 通过 `useAuth()` 读取权限上下文
- `allowed` 为 true 渲染默认 slot，false 渲染 fallback slot

权限体系三件套：

| 文件 | 说明 |
| --- | --- |
| [src/components/auth/store.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/auth/store.ts) | 模块级 `authState`（reactive Set）、`setAuthCodes()`、`hasAuth()` — 无注入上下文时的回退 |
| [src/components/auth/context.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/auth/context.ts) | `authContextKey`、`provideAuth()`、`injectAuthContext()` |
| [src/components/auth/useAuth.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/auth/useAuth.ts) | `useAuth()` — 优先读取注入的权限上下文，否则回退到模块级码表 |

#### DpProvide / useInject（上下文注入，行为组件）

[src/components/provide/DpProvide.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/provide/DpProvide.vue)

```ts
interface DpProvideComp { key: string; value: unknown }
```

- 调用 `provide(c.value.key, c.value.value)` 注入任意字符串 key 的值
- 渲染为透明 `<slot />`

[src/components/provide/useInject.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/provide/useInject.ts)：

```ts
function useInject<T>(key: string): T | undefined
```

#### DpLazy（延迟渲染，行为组件）

[src/components/lazy/DpLazy.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/lazy/DpLazy.vue)

```ts
interface DpLazyComp { rootMargin: string; delay: number }
```

- 基于 `IntersectionObserver` 监听根元素进入视口
- 进入视口后按 delay 延迟渲染 slot 内容
- 无 IntersectionObserver 时直接渲染

#### DpConfigProvider（全局配置，行为组件）

[src/components/config/DpConfigProvider.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/config/DpConfigProvider.vue)

```ts
interface DpConfigProviderComp {
  themes: Record<string, DpThemeDefinition>          // 托管的命名主题
  theme: string                                      // 受控主题名
  defaultTheme: string
  themeOverrides: DpThemeOverrides                   // key 去掉 --dp- 前缀
  mode: DpThemeMode | ''                             // 'light' | 'dark' | 'system'，空串使用存储值 / 主题定义 / defaultMode
  defaultMode: DpThemeMode
  persist: boolean
  storageKey: string
  applyTo: 'self' | 'document'
}
```

- 全部为纯数据参数，默认值来自 `app.use(DpUi, options)` 的全局主题配置，`comp` 优先
- 自身实现主题宿主逻辑（`useThemeHost`），不依赖 `DpThemeProvider`
- 用 `useScope` 把 `--dp-*`、`data-dp-theme`、主题类名合并到插槽根节点，不产生包裹元素
- 事件：`change(mode, resolved)`

#### 主题全局配置

[src/theme/themeConfig.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/theme/themeConfig.ts)

```ts
interface DpThemeConfig {
  themes?: Record<string, DpThemeDefinition>
  theme?: string
  defaultTheme?: string
  themeOverrides?: DpThemeOverrides
  mode?: DpThemeMode | ''
  defaultMode?: DpThemeMode
  persist?: boolean
  storageKey?: string
  applyTo?: 'self' | 'document'
}

function provideDpThemeConfig(app: App, config?: DpThemeConfig): void
function setGlobalThemeConfig(config?: DpThemeConfig): void
function getGlobalThemeConfig(): DpThemeConfig
function useDpThemeConfig(): DpThemeConfig
function resolveThemeHostComp(
  comp?: Partial<DpThemeHostComp>,
  config?: DpThemeConfig,
): DpThemeHostComp
```

- `app.use(DpUi, options)` 会把 `options` 注入 app 并记为模块级全局默认值
- `DpConfigProvider` / `DpThemeProvider` 通过 `useDpThemeConfig()` 读取，并按「`comp` → 全局配置 → 内置默认值」合并
- `resolveThemeHostComp` 保证 `themes` 为空时回退 `{ default: {} }`

#### 主题模块（src/theme）

与 `src/page`、`src/panel` 同级，入口 `src/theme/index.ts`，可按需导入 `@dp_ui/core/theme`。包含主题提供器、主题控制器、上下文 composable 与主题切换组件。

主题提供器 [src/theme/DpThemeProvider.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/theme/DpThemeProvider.vue)：

```ts
interface DpThemeDefinition {
  overrides?: DpThemeOverrides
  className?: string
  mode?: DpThemeMode
}

interface DpThemeProviderComp {
  themes: Record<string, DpThemeDefinition>
  theme: string
  defaultTheme: string
  themeOverrides: DpThemeOverrides
  mode: DpThemeMode | ''
  defaultMode: DpThemeMode
  persist: boolean
  storageKey: string
  applyTo: 'self' | 'document'
}
```

- 托管多个命名主题，`useTheme`、`DpThemeSwitch`、`DpThemeToggle` 必须在其子树内使用
- 缺少 `comp` 字段时使用 `app.use(DpUi, options)` 的全局主题配置
- 固定为 Fragment 形态：不生成包裹元素，`--dp-*`、`data-dp-theme`、`color-scheme` 与主题类名合并到插槽根节点，DOM 层级与 Provider 外一致
- 主题定义 `overrides` 与 `themeOverrides` 合并后写入 CSS 变量；`className` 作为主题类名挂到插槽根节点，令牌可直接写在 `<style>` 块
- 主题定义的 `mode` 在激活时同步到控制器
- `applyTo="document"` 时额外把主题同步到 `<html>`
- 事件：`change(theme, mode, resolved)`

通用透明作用域工具 [src/composables/useScope.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/composables/useScope.ts)：

```ts
type DpScopeAttrs = Record<string, unknown>

/** 创建无包裹元素的作用域组件：把 scopeAttrs 合并到每个插槽根节点 */
function useScope(name?: string): Component
/** 低层工具：直接处理 vnode 数组 */
function applyScopeAttrs(nodes: unknown[], attrs: DpScopeAttrs): VNode[]
```

- 返回的组件接收 `scopeAttrs`，渲染时把属性合并到每个根节点；数组与 Fragment 会递归展开
- 文本 / 注释节点无法承载属性，原样保留
- 与主题无关：任何需要「不改变 DOM 层级地下发属性」的 Provider 都可复用
- `DpConfigProvider` 与 `DpThemeProvider` 都用它实现 Fragment 形态，二者互不嵌套

主题控制器 [src/theme/themeMode.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/theme/themeMode.ts)：

```ts
function createThemeController(options?: {
  mode?: DpThemeMode | ''
  defaultMode?: DpThemeMode
  persist?: boolean
  storageKey?: string
  applyToDocument?: boolean
  useDocumentInitial?: boolean
  disposeOnScope?: boolean
}): DpThemeController

interface DpThemeController {
  mode: Ref<DpThemeMode>
  resolvedMode: ComputedRef<'light' | 'dark'>
  isDark: ComputedRef<boolean>
  setMode: (mode: DpThemeMode) => void
  toggleMode: () => void
  dispose: () => void
}
```

- 初始化优先级：显式 `mode` → localStorage → 主题定义 → `defaultMode`（`system`）
- `system` 通过 `matchMedia('(prefers-color-scheme: dark)')` 跟随系统并监听变化

主题组件：

| 组件 | 说明 |
| --- | --- |
| `DpThemeProvider` | 多主题托管与作用域（`themes` / `theme` / `defaultTheme`） |
| `DpThemeSwitch` | 浅色 / 深色 / 跟随系统三段选择（`comp.showLabels`、键盘方向键） |
| `DpThemeToggle` | 单按钮浅深切换（`comp.showLabel`、`comp.label`、`theme.round`） |

[src/theme/themeContext.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/theme/themeContext.ts)：

```ts
interface ThemeContext {
  themeOverrides: Record<string, string | number>
  theme: Ref<string>
  themes: Ref<Record<string, DpThemeDefinition>>
  themeNames: ComputedRef<string[]>
  setTheme: (theme: string) => void
  themeMode: DpThemeController
  mode: Ref<DpThemeMode>
  resolvedMode: ComputedRef<'light' | 'dark'>
  isDark: ComputedRef<boolean>
  setMode: (mode: DpThemeMode) => void
  toggleMode: () => void
}

function useTheme(options: DpThemeOptions): ThemeContext  // 创建函数式作用域
function useTheme(): ThemeContext                          // 读取最近作用域
function useThemeController(): DpThemeController
```

- **必需作用域**：`useTheme` / `useThemeController` 必须在 `DpThemeProvider`（或内部包装它的 `DpConfigProvider`）内调用，否则抛错。
- **函数式作用域**：`useTheme({ themeOverrides })` 在当前组件 `provide` 嵌套上下文并追加令牌覆盖；主题名与模式仍由 `DpThemeProvider` 托管，同一组件重复调用返回首次创建的作用域。
- **主题信息**：`theme` / `themes` / `themeNames` / `setTheme` 来自最近的 Provider，函数式作用域透传。
- **渲染落地**：`useTheme(options)` 在组件挂载、更新或覆盖变化时，把 `data-dp-theme`、`color-scheme`、`--dp-*` 写到组件根元素（支持多根 Fragment），卸载时恢复根元素原值。
- 带参数调用必须在组件 `setup` 中，否则抛错。

令牌覆盖类型 [src/theme/themeOverrides.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/theme/themeOverrides.ts)：

```ts
type DpThemeOverrides = Partial<Record<DpThemeOverrideKey, DpThemeCssValue>> & {
  [key: string]: DpThemeCssValue | undefined
}
```

- `DpThemeOverrideKey` 汇总全部内置 `--dp-*` 令牌键（省略前缀），提供 IDE 补全
- 颜色 / 长度 / 阴影 / 时长 / 缓动 / 字体分别使用带 JSDoc 示例的值类型
- TS 内联只能做到「键补全 + 常见值字面量」；需要 CSS 全量补全与取色器时改用 `DpThemeDefinition.className`，在 `<style>` 块中书写 `--dp-*` 变量
- `dpThemeOverrideKeys` 提供运行时键列表，测试保证与 `dpCssVars` 同步

### 4.7 指令

| 文件 | 说明 |
| --- | --- |
| [src/directives/auth.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/directives/auth.ts) | `v-auth="'code'"`：无权限时 `display: none` |
| [src/directives/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/directives/index.ts) | 导出 `vAuth` |

### 4.8 设计令牌与 UnoCSS preset

| 文件 | 说明 |
| --- | --- |
| [src/tokens/theme.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/tokens/theme.ts) | 设计令牌定义：`dpColors`/`dpSpacing`/`dpRadius`/`dpBoxShadow`/`dpFontSize` → `dpTheme` + `dpCssVars`（`--dp-*`） |
| [src/tokens/presetDpUi.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/tokens/presetDpUi.ts) | `presetDpUi()` — UnoCSS preset（name: `preset-core`，theme: dpTheme） |
| [src/tokens/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/tokens/index.ts) | 聚合导出 |

**颜色令牌**：primary/success/warning/danger/info + surface/text/textSecondary/border/borderHover，每色含 hover 变体。

**尺寸令牌**：`--dp-size-btn-h-sm` (32px) / `--dp-size-btn-h` (40px) / `--dp-size-btn-h-lg` (48px) / `--dp-space-btn-x` (16px)。

### 4.9 工具函数

| 文件 | 说明 |
| --- | --- |
| [src/utils/withInstall.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/utils/withInstall.ts) | `withInstall()` 给组件挂载 install 方法；`createInstaller()` 批量注册组件+指令为 Plugin |
| [src/utils/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/utils/index.ts) | 导出 withInstall、createInstaller、SFCWithInstall 类型 |

```ts
type SFCWithInstall<T> = T & Plugin

function withInstall<T extends Component>(comp: T, name?: string): SFCWithInstall<T>
function createInstaller(
  components: Array<Component & Plugin>,
  directives?: Record<string, Directive>
): Plugin
```

`withInstall` 供基于 core 扩展的库（如 @dp_ui/chat）复用。

### 4.10 构建配置

| 文件 | 说明 |
| --- | --- |
| [vite.config.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/vite.config.ts) | 库开发/测试基础配置（vue 插件 + @ 别名） |
| [uno.config.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/uno.config.ts) | UnoCSS 配置：presetMini + presetDpUi + presetTagify + presetAttributify + presetLegacyCompat + presetIcons + transformers |
| [build/build.lib.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/build/build.lib.ts) | 库模式多入口构建：vue() + UnoCSS()，输出 ES/CJS，外部化 vue/reka-ui/vue-router/unocss |
| [build/collect-entries.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/build/collect-entries.ts) | 自动收集入口：core（全量）+ preset-core + page/index + panel/index + 每个组件的 components/<分类>/<组件>/index |

**产物结构**：

```
dist/
├── core.mjs / core.cjs           # 全量入口
├── style.css                     # 全量样式
├── preset-core.mjs               # UnoCSS preset
├── components/<分类>/<组件>/index.mjs  # 按需子路径
├── page/index.mjs
├── panel/index.mjs
└── types/                        # .d.ts
```

**exports map**（[package.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/package.json#L16-L44)）：

- `.` 全量入口
- `./style.css` 样式
- `./unocss` preset 子路径
- `./page` / `./panel` 容器层子路径
- `./components/*` 组件按需子路径

### 4.11 单元测试

测试文件位于各组件目录的 `__tests__/`：

- [src/components/common/button/__tests__/DpButton.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/common/button/__tests__/DpButton.spec.ts)
- [src/components/data-entry/input/__tests__/DpInput.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/data-entry/input/__tests__/DpInput.spec.ts)
- [src/components/data-entry/switch/__tests__/DpcSwitch.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/data-entry/switch/__tests__/DpSwitch.spec.ts)
- [src/components/data-display/table/__tests__/DpTable.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/data-display/table/__tests__/DpTable.spec.ts)
- [src/components/auth/__tests__/DpAuth.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/components/auth/__tests__/DpAuth.spec.ts)
- [src/panel/__tests__/DpPanel.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/panel/__tests__/DpPanel.spec.ts)
- [src/composables/__tests__/useDpProps.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/core/src/composables/__tests__/useDpProps.spec.ts)

---

## 5. @dp_ui/schema — 数据驱动编排层

**入口**：[packages/schema/src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/index.ts)
**包配置**：[packages/schema/package.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/package.json)
**设计文档**：[packages/schema/DESIGN.md](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/DESIGN.md)
**README**：[packages/schema/README.md](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/README.md)

### 5.1 核心理念

- **schema 元数据决定结构/样式**：传一棵 `DsNode` 树（`component` + `props` + `style` + `children`），引擎渲染成 @dp_ui/core 组件树
- **绑定数据 / 数据源提供交互数据**：`field` 绑定 model、`dataSource` 提供选项、`visible`/`disabled` 表达联动、`rules` 声明校验

### 5.2 类型系统

[src/types/schema.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/types/schema.ts) 定义 schema 元数据模型：

| 类型 | 说明 |
| --- | --- |
| `DsNode` | schema 节点（统一模型）：component/props/style/children/field/label/help/rules/dataSource/visible/disabled/valueType/fallbackValue/text |
| `DsStyle` | 样式元数据：class/style/cssVars/size/variant/round/block/bordered/span/full |
| `DsCondition` | 条件表达式：`boolean \| ((ctx: DsEvalCtx) => boolean)` |
| `DsEvalCtx` | 求值上下文：`{ model: Record<string, unknown> }` |
| `DsOption` | 选项项：`{ label, value, disabled? }` |
| `DsOptionsProvider` | 选项提供者：`DsOption[] \| (() => DsOption[] \| Promise<DsOption[]>)` |
| `DsRemoteSource` | 远程数据源：`{ url, method?, params?, map }` |
| `DsDataSource` | 数据源：`{ options?, remote?, dependsOn?, optionsKey?, immediate? }` |
| `DsRule` | 校验规则：`{ required?, pattern?, validator?, message? }` |
| `DsSchemaInput` | 根渲染入参：`DsNode \| DsNode[]` |

[src/types/registry.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/types/registry.ts) 定义注册表：

| 类型 | 说明 |
| --- | --- |
| `DsRegistryEntry` | 注册条目：`{ component, contract?: 'dp'\|'native', valueType?, optionsKey?, renderChildren?, description? }` |
| `DsResolvedEntry` | 解析结果：`{ entry, style }` |
| `DsRegistry` | 组件注册表类（register/registerMany/has/get/names） |
| `defaultRegistry` | 全局默认注册表实例 |

[src/types/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/types/index.ts) 聚合导出所有类型。

### 5.3 @dp_ui/core 适配层

[src/adapters/dpUi.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/adapters/dpUi.ts)

```ts
function installDpUi(registry: DsRegistry): DsRegistry
```

把 @dp_ui/core 的 Dp* 组件注册进 registry，统一走 `{ theme, comp }` + v-model 契约（`contract: 'dp'`）。通过相对路径直接引用 core 的 `.vue` 源文件（monorepo dev/测试环境一致）。

**已内置适配的组件**：button、tag、badge、avatar、divider、card、empty、space、grid、panel、input、textarea、number、switch、checkbox、radio（optionsKey: 'options'）、select（optionsKey: 'options'）、spin、skeleton、alert。

### 5.4 渲染引擎组件

| 组件 | 文件 | 职责 |
| --- | --- | --- |
| `DsSchema` | [src/components/DsSchema.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/components/DsSchema.vue) | 数据驱动渲染引擎根组件：provide 上下文、递归渲染节点树、暴露 validate() |
| `DsForm` | [src/components/DsForm.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/components/DsForm.vue) | 表单便捷入口：字段布局（多列 grid）、校验、submit |
| `DsNode` | [src/components/DsNode.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/components/DsNode.vue) | 递归渲染单个节点：visible 判断、字段布局（label+控件+help+error）、容器 children 递归 |
| `DsControl` | [src/components/DsControl.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/components/DsControl.vue) | 渲染节点元素本体：registry 解析、theme/comp 映射、field 绑定、dataSource 注入、disabled/事件处理 |

#### DsSchema 关键 API

```ts
// props
schema: DsSchemaInput          // 节点树/数组
model: Record<string, unknown>  // 绑定数据对象
registry?: DsRegistry          // 自定义注册表（默认 defaultRegistry）
request?: DsRequest            // 远程请求实现（默认 fetch）

// exposed
validate(): Promise<boolean>   // 整表校验，错误写入 errors
clearErrors(): void
```

#### DsControl 核心逻辑（[src/components/DsControl.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/components/DsControl.vue#L62-L103)）

- 按 registry 解析 `component` 名
- `contract: 'dp'`（@dp_ui/core 契约）：schema.style → `theme` prop、schema.props → `comp` prop
- `contract: 'native'`（原生契约）：schema.props 直接透传 + class/style/cssVars 合并
- `field` 存在时绑定 model 值（`modelValue` + `onUpdate:modelValue`）
- `dataSource` 注入 options 到 optionsKey
- `disabled` 条件求值后写入
- props 中的 `on*` 键作为事件监听器分离处理
- 未注册组件渲染可读提示

### 5.5 运行时纯函数

| 文件 | 函数 | 说明 |
| --- | --- | --- |
| [src/runtime/path.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/path.ts) | `parsePath(path)` | 解析路径为段数组：`'a.b[0].c'` → `['a','b',0,'c']` |
| | `getPath(model, path)` | 读取 model 上 path 对应的值 |
| | `setPath(model, path, value)` | 在 model 上按 path 写入值，缺失中间层级自动创建 |
| | `defaultValueFor(type)` | 按值类型给出空值回退 |
| [src/runtime/condition.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/condition.ts) | `evalCondition(cond, ctx, defaultValue)` | 求值条件：undefined→默认、布尔原样、函数求值 |
| [src/runtime/validate.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/validate.ts) | `validateField(value, rules, ctx)` | 校验单个字段，返回错误文案（通过返回空串） |
| | `collectFields(nodes)` | 深度遍历 schema，收集带 field 的节点 |
| | `validateFields(nodes, model)` | 校验一组字段节点，返回 `{ valid, errors }` |
| [src/runtime/dataSource.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/dataSource.ts) | `buildRemoteInit(ds, ctx)` | 组装远程请求 init（GET 拼 query / POST body） |
| | `buildOptionsLoader(ds, ctx, request)` | 构建选项加载函数（options 优先，否则 remote） |
| [src/runtime/style.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/style.ts) | `normalizeStyle(style)` | 归一化样式元数据（分离布局键 span/full 与 themeProps） |
| | `toCssVars(cssVars)` | CSS 变量覆盖（key 缺 `--` 自动补齐） |
| [src/runtime/context.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/context.ts) | `provideDsContext(ctx)` / `useDsContext()` / `tryUseDsContext()` | 渲染上下文 provide/inject |
| | `useFieldValue(model, field, options)` | 构建字段的可写响应式值（读取回退 fallbackValue/类型默认值，写入回 model path） |

**DsSchemaContext**（[src/runtime/context.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/context.ts#L14-L23)）：

```ts
interface DsSchemaContext {
  model: Record<string, unknown>      // 绑定数据
  registry: DsRegistry                 // 组件注册表
  request: DsRequest                   // 远程请求实现
  errors: Record<string, string>       // 字段错误集
}
```

### 5.6 composable：useFieldOptions

[src/composables/useFieldOptions.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/composables/useFieldOptions.ts)

```ts
function useFieldOptions(
  node: DsNode,
  ctx: { model: Record<string, unknown>; request: DsRequest }
): { hasSource, options, loading, error, reload }
```

**职责**：

- 静态数组：同步填充选项
- 惰性函数/远程：异步加载，管理 loading/error
- `dependsOn` 依赖字段变化时自动重新加载（级联场景）
- `immediate` 默认 true
- `onScopeDispose` 防止卸载后写入

### 5.7 单元测试

| 文件 | 覆盖 |
| --- | --- |
| [src/runtime/__tests__/path.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/__tests__/path.spec.ts) | 路径解析与读写 |
| [src/runtime/__tests__/condition.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/__tests__/condition.spec.ts) | 条件求值 |
| [src/runtime/__tests__/validate.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/__tests__/validate.spec.ts) | 字段校验 |
| [src/runtime/__tests__/dataSource.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/runtime/__tests__/dataSource.spec.ts) | 数据源加载 |
| [src/components/__tests__/DsForm.spec.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/schema/src/components/__tests__/DsForm.spec.ts) | 表单渲染与校验 |

---

## 6. @dp_ui/chat — AI 对话界面组件库

**入口**：[packages/chat/src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/index.ts)
**包配置**：[packages/chat/package.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/package.json)

参照 MateChat 设计，基于 @dp_ui/core + UnoCSS，不依赖 reka-ui，使用独立 `--dpc-*` 令牌命名空间。

### 6.1 组件清单

[src/components/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/index.ts) 聚合导出 23 个子目录的组件：

| 分类 | 组件 |
| --- | --- |
| 布局/外壳 | DpcLayout、DpcLayoutAside、DpcLayoutContent、DpcLayoutHeader、DpcLayoutSender |
| 聊天部件 | DpcHeader、DpcIntroduction、DpcPrompt、DpcList、DpcBubble、DpcBubbleLoading、DpcSender、DpcToolbar |
| 输入增强/内容 | DpcAttachment、DpcFileList、DpcMarkdownCard、DpcMention、DpcPopperTrigger |
| Agent 原语（beautiful-ui 设计语言） | DpcLoadingState、DpcThinkingState、DpcStreamingText、DpcToolChips、DpcApprovalCard、DpcTaskRows、DpcContextCards、DpcPromptBar |
| 国际化/主题 | DpcLocale、DpcConfigProvider |

### 6.2 统一 Props 模型：theme + comp（与 core 同构）

[src/types/dpc-props.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/types/dpc-props.ts)：

```ts
interface DpcThemeProps {
  class?: ClassValue
  style?: StyleValue
  size?: DpcSize        // 'small' | 'medium' | 'large'
  variant?: DpcType      // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  round?: boolean
  block?: boolean
  bordered?: boolean
  cssVars?: Record<string, string | number>  // key 省略 --dpc- 前缀自动补齐
}

type DpcProps<Comp extends object = object> = {
  theme?: DpcThemeProps
  comp?: Partial<Comp>
}
```

公共类型见 [src/types/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/types/index.ts)：`DpcSize`、`DpcType`、`DpcBooleanish`。

### 6.3 对话数据模型

[src/types/chat.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/types/chat.ts)：

```ts
type DpcChatRole = 'user' | 'assistant'
type DpcChatMessageStatus = 'thinking' | 'done' | 'error' | 'paused'

interface DpcChatMessage {
  id?: string
  role: DpcChatRole
  content: string
  loading?: boolean
  status?: DpcChatMessageStatus
  statusText?: string
  meta?: Record<string, unknown>
  createdAt?: number | string
}

function createDpcChatId(prefix?: string): string  // 生成稳定消息 id
```

状态归属使用方（如 Pinia），库只提供纯类型与纯函数。

### 6.4 核心 composable：useDpcProps

[src/composables/useDpcProps.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/composables/useDpcProps.ts)

与 core 的 `useDpProps` 同构，但 CSS 变量前缀为 `--dpc-`。返回 `{ comp, style, rootAttrs }`。

### 6.5 设计令牌

[src/tokens/theme.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/tokens/theme.ts)：

- `dpcColors`：beautiful-ui 风格的 oklch 冷调中性色（page/canvas/surface/inset/hover/field、ink/ink-2/ink-3、line/line-strong/line-soft、accent/accent-tint、green/orange/red 及其 tint、tooltip-*），并保留对话专属别名（primary/text/border/bubbleUser/bubbleAssistant 等）
- `dpcSpacing` / `dpcRadius`（新增 chip 6 / control 8 / card 10 / window 14）/ `dpcBoxShadow`（新增 hairline/btn/card/raised/overlay 语义阴影）/ `dpcFontSize`（新增 2xs）
- `dpcTheme`：UnoCSS preset 兼容结构
- `dpcCssVars`：由 `colorVars()` 统一生成的 `--dpc-*` CSS 变量键值对，另含圆角、语义阴影、`--dpc-font-mono`、`--dpc-ease-*`、`--dpc-chat-max-width`、`--dpc-z-pop`、`--dpc-size-*`
- `dpcColorsDark` / `dpcCssVarsDark`：暗色配色与暗色描边/阴影，由 `DpcConfigProvider` 的 `data-dpc-theme="dark"` 触发覆盖
- 动画与工具类在 [src/styles/index.css](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/styles/index.css)：`dpc-shimmer-text`、`dpc-pixel-on`、`dpc-fade-up`、`dpc-pop-in`、`dpc-caret-blink`，以及 `.dpc-card-pad`、`.dpc-icon-button`、`.dpc-animated-underline`、`.dpc-source-avatar` 等

[src/tokens/presetDpChat.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/tokens/presetDpChat.ts)：`presetDpChat()` UnoCSS preset（name: `preset-chat`）。

### 6.6 关键组件说明

#### DpcLayout

[src/components/Layout/DpcLayout.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/Layout/DpcLayout.vue)：聊天外壳，使用 useDpcProps，渲染 chat grid，背景 `--dpc-color-surface`。

#### DpcSender

[src/components/Sender/DpcSender.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/Sender/DpcSender.vue)：

- props：placeholder、disabled、loading、autoClear、maxLength、submitShortcut、autosize
- emits：`send(text)`、`stop()`
- 行为：提交时 trim 内容、按 autoClear 清空、处理 stop、暴露 `focus/submit/resizeTextarea`

#### DpcToolbar

[src/components/Toolbar/DpcToolbar.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/Toolbar/DpcToolbar.vue)：操作按钮配置（copy/like/dislike/refresh/delete），默认可见性与激活态 props，emits 对应事件。

#### DpcMarkdownCard

[src/components/MarkdownCard/DpcMarkdownCard.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/MarkdownCard/DpcMarkdownCard.vue)：轻量 Markdown 渲染器，解析代码块，渲染文本/代码段。

#### DpcMention

[src/components/Mention/DpcMention.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/Mention/DpcMention.vue)：提及/自动补全浮层列表，过滤选项，emit 选中项，基于 DpPopover 渲染。

#### DpcLocale

[src/components/Locale/DpcLocale.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/Locale/DpcLocale.vue)：本地化 provider，接受 locale/messages，与默认 locale map 合并，provide DpcLocale context。默认 locale 见 [src/components/Locale/locales.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/components/Locale/locales.ts)。

#### Agent 原语（beautiful-ui 移植）

视觉语言移植自 beautiful-ui（MIT）：冷调 oklch 中性色、1px 实色发丝线、分层语义阴影、紧凑圆角、Inter + JetBrains Mono。命令行组件沿用 `{ theme, comp }` 契约与 `--dpc-*` 令牌，不引入第三方依赖。

| 组件 | 职责 | 主要 comp 字段 / 事件 |
| --- | --- | --- |
| `DpcLoadingState` | 像素网格加载态（Drive/Dots/Orbit/Surfer）+ 微光文案 + 实时计时 | `label`、`variant`、`showElapsed`、`mediaSrc`；`#media` 插槽 |
| `DpcThinkingState` | 可展开的思考/搜索/工具追踪，自动播放后定格 | `variant`、`rows`、`query`、`active`、`done`、`autoPlay`；`settled` / `toggle` / `selectTool` |
| `DpcStreamingText` | 逐词流式正文、行内引用、来源折叠、操作行与追问 | `content`、`sources`、`followUps`、`labels`、`loop`、`autoPlay`、`speed`；`done` / `followUp` / `action` / `sourceClick`；暴露 `complete/restart/setCount` |
| `DpcToolChips` | 工具调用行与文件 diff 胶囊，悬停预览 diff | `steps`、`diffs`、`diffLines`、`labels`、`autoPlay`；`openChange` / `toggleRow` |
| `DpcApprovalCard` | 人在环问答卡：单选自动前进、多选等待、自定义答案 | `questions`、`labels`、`resettable`、`defaultOpen`；`answerChange` / `submitted` |
| `DpcTaskRows` | 任务状态行（完成/进行中/序列流转），支持列表与胶囊两种排布 | `rows`、`variant`、`labels`、`autoPlay`；`toggleRow` |
| `DpcContextCards` | 检索分块卡片，来源胶囊延迟揭示 | `chunks`、`labels`、`autoPlay` |
| `DpcPromptBar` | 输入条：附件、模型选择、自适应高度、Enter/Shift+Enter 提交 | `models`、`model`、`attachments`、`variant`、`submitShortKey`、`maxRows`；`send` / `stop` / `modelChange` / `attach` / `removeAttachment`；`v-model` |

共享图标见 [src/internal/AgentIcon.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/internal/AgentIcon.vue)，阶段计时器见 [src/composables/useSequence.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/src/composables/useSequence.ts)。演示页为 `playground` 的 `/agent-kit` 路由。

### 6.7 构建

构建配置与 core 同构（[build/build.lib.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/chat/build/build.lib.ts)），复用 core 的 `createInstaller`。exports map 含 `.` / `./style.css` / `./unocss` / `./components/*`。

---

## 7. @dp_ui/video-rtc — 视频播放器组件

**入口**：[packages/VideoRTC/src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/index.ts)
**包配置**：[packages/VideoRTC/package.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/package.json)
**README**：[packages/VideoRTC/README.md](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/README.md)

### 7.1 组件

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| `VideoRTC` | [src/VideoRTC.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/VideoRTC.vue) | go2rtc 视频播放器内核（WebRTC/MSE/HLS/MJPEG） |
| `VideoStream` | [src/VideoStream.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoStream.vue) | 在 VideoRTC 上叠加状态栏 GUI |

### 7.2 VideoRTC 关键能力

**props**（[src/VideoRTC.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/VideoRTC.vue#L5-L39)）：

- `src`：go2rtc 地址
- `visibilityCheck` / `visibilityThreshold`：可见性检测
- `mode`：播放模式优先级
- `media`：媒体流
- `fit`：填充模式
- `ratio`：宽高比

**核心逻辑**：

- [L163-L258](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/VideoRTC.vue#L163-L258)：WebSocket 连接与通道选择（解析 go2rtc 消息，按 mode 优先级选 MSE/HLS/MP4/WebRTC/MJPEG）
- [L312-L463](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/VideoRTC.vue#L312-L463)：MSE 流处理、WebRTC peer connection 创建、ICE candidate/answer 处理、错误分支与重连
- [L485-L590](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/VideoRTC.vue#L485-L590)：WebRTC/MSE 择优与 fallback（远端描述/音频视频轨道/H265/H264/MSE codec 优先级决定使用 WebRTC 还是回退 MSE，处理 MJPEG/HLS/MP4 分支）

### 7.3 VideoStream

[src/VideoStream.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/VideoRTC/src/VideoStream.vue)：复用 VideoRTC 的参数，将 `connect/message/pcvideo` 事件转换为 `loading/MSE/HLS/MP4/MJPEG/RTC/error` 状态，暴露 `mode/status/play/send`。

---

## 8. dpui_hub — 组件分发系统

dpui_hub 是一套组件分发基础设施，包含 Rust CLI/Server 与 TypeScript Vite 插件/运行时，实现「组件包发布 → 远程分发 → 构建期/运行时加载」闭环。

### 8.1 @dp_ui/hub_cli（Rust 终端工具）

**路径**：[packages/dpui_hub_cli](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_cli)
**Cargo.toml**：[packages/dpui_hub_cli/Cargo.toml](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_cli/Cargo.toml)

`dpui` 命令行工具，提供 publish/use/list/manifest/fix/init 子命令：

| 子命令 | 说明 |
| --- | --- |
| `publish` | 发布组件包目录（manifest.json + dist/，打包 tar.gz 上传） |
| `use` | 解析并锁定组件版本，写入 lockFile（默认 `dpui-hub.lock.json`） |
| `list` | 列出 hub 上的包 |
| `manifest` | 为构建产物目录生成/更新 manifest.json |
| `fix` | 修复组件工程声明链路（重建本地类型声明、tsconfig paths） |
| `init` | 初始化工程接入 |

**关键依赖**：clap（CLI）、reqwest（HTTP）、tokio（异步）、serde/serde_json、tar/flate2（打包）。

源码：[src/main.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_cli/src/main.rs)

### 8.2 @dp_ui/hub_server（Rust 分发服务器）

**路径**：[packages/dpui_hub_server](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server)

基于 axum 的组件分发服务器，模块：

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 入口 | [src/main.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/main.rs) | 启动 axum 服务，引导管理员 |
| config | [src/config.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/config.rs) | 环境变量配置（HUB_ADDR/HUB_DATA_DIR/HUB_PUBLISH_TOKEN 等） |
| store | [src/store.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/store.rs) | 持久化存储 |
| api | [src/api.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/api.rs) | 路由与应用组装 |
| auth | [src/auth.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/auth.rs) | 认证与密码哈希 |
| admin | [src/admin.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/admin.rs) | 管理接口 |
| publish | [src/publish.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/publish.rs) | 发布处理 |
| manifest | [src/manifest.rs](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_server/src/manifest.rs) | manifest 处理 |

**分发路由**：

- `/healthz` 健康检查
- `/v/index.json` 包索引
- `/v/<name>@<version>/dist/<file>` 产物分发
- `/v/<name>@<version>/source/<file>` 源码分发
- `/v/<name>@<version>/types/<file>` 类型声明分发

### 8.3 @dp_ui/hub_vite（Vite 插件）

**路径**：[packages/dpui_hub_vite](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_vite)
**入口**：[src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_vite/src/index.ts)

双插件：

| 插件 | 文件 | 说明 |
| --- | --- | --- |
| `hubVite()`（默认导出） | [src/consumer.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_vite/src/consumer.ts) | 消费端构建期远程组件加载：`dpui-hub:<name>` 虚拟导入 → 读 lock → fetch 远程预编译 ESM（磁盘缓存 `.hub-cache`）→ 注入远程 css 虚拟导入 → transform 改写裸导入为宿主解析结果 |
| `hubPackage()` | [src/package.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_vite/src/package.ts) | 组件开发者打包插件：打成符合规格的可发布包 |

**机制要点**：

- `dpui-hub:<name>` 虚拟导入解析
- 读 `<root>/dpui-hub.lock.json` 获取版本与 module/css 路径
- 内容寻址磁盘缓存（`node_modules/.hub-cache/`）
- 远程模块内裸导入（vue/reka-ui）改写为宿主解析结果（依赖对齐、单 Vue 实例）
- 无 lock 文件时插件完全无操作

### 8.4 @dp_ui/hub_runtime（运行时远程组件）

**路径**：[packages/dpui_hub_runtime](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_runtime)
**入口**：[src/index.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_runtime/src/index.ts)

| 文件 | 说明 |
| --- | --- |
| [src/HubRemote.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_runtime/src/HubRemote.ts) | `<HubRemote pkg="dpui-hub:@dp_ui/button">` 声明式运行时远程组件：attrs/slots 透传，loading/error 插槽，pkg 响应式重新加载 |
| [src/HubRemoteShadow.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_runtime/src/HubRemoteShadow.ts) | Shadow DOM 隔离版本 |
| [src/loader.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_runtime/src/loader.ts) | `loadRemote(pkg)` 加载器：importmap + 样式注入 |

### 8.5 @dp_ui/hub_registry（官方组件真源）

**路径**：[packages/dpui_hub_registry](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry)
**包配置**：[dpui.pkg.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry/dpui.pkg.json)

声明可发布的样例组件包：

- `@dp_ui_hub/button`（v0.1.4，测试）
- `@dp_ui/button`（v0.1.4，样例按钮 vanilla 样式）
- `@dp_ui/tag`（v0.1.4，UnoCSS 原子类）

源码：[src/ui/button/Button.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry/src/ui/button/Button.vue)、[src/ui/tag/tag.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry/src/ui/tag/tag.ts)

构建配置：[vite.config.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry/vite.config.ts)（`hubPackage()` 插件读取 dpui.pkg.json），[uno.config.ts](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry/uno.config.ts)。

产物 manifest 示例：[pkg/@dp_ui_hub/button@0.1.4/manifest.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_registry/pkg/@dp_ui_hub/button@0.1.4/manifest.json)：

```json
{
  "name": "@dp_ui_hub/button",
  "version": "0.1.4",
  "type": "vue-component",
  "entry": { "module": "dist/button.mjs", "css": ["dist/style.css"] },
  "cssStrategy": "vanilla",
  "source": { "files": ["source/src/ui/button/button.ts", "source/src/ui/button/Button.vue"] }
}
```

### 8.6 @dp_ui/hub_example（消费示例）

**路径**：[packages/dpui_hub_example](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_example)
**包配置**：[dpui.pkg.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_example/dpui.pkg.json)

通过 `uses` 远程引用 `@dp_ui/button@0.1.3` 与 `@dp_ui_hub/button@0.1.3`，[src/App.vue](file:///d:/projects/hs/codes/dp/dp_ui/packages/dpui_hub_example/src/App.vue) 使用 `import { Button } from 'dpui-hub:@dp_ui_hub/button'` 消费远程组件。

### 8.7 端到端验证

[scripts/hub-e2e.mjs](file:///d:/projects/hs/codes/dp/dp_ui/scripts/hub-e2e.mjs) 执行完整闭环：

1. 构建样例组件包 + 声明产物断言
2. 启动 server + 等待健康检查
3. CLI 编译 + `dpui fix` 声明链路修复断言
4. publish 各组件 + 分发断言（index/mjs/css/source/types + 404）
5. 重复发布 409 断言
6. `dpui use --mode source` 源码落盘断言
7. `dpui use`（remote）lock + 本地类型落盘 + tsconfig paths 断言 + `dpui fix` 重建类型断言
8. example 构建产物断言（远程 render js + 样式 css 进宿主 bundle）
9. 类型提示 tsc 探针断言（typed 包 props 误用报错，untyped 包 any 不报错）

---

## 9. playground — 演示应用

**路径**：[packages/playground](file:///d:/projects/hs/codes/dp/dp_ui/packages/playground)
**包配置**：[packages/playground/package.json](file:///d:/projects/hs/codes/dp/dp_ui/packages/playground/package.json)

演示应用，依赖 `@dp_ui/core` / `@dp_ui/chat` / `@dp_ui/schema`（均 `workspace:*`），验证全量/按需接入，包含 dev/build/preview/test:e2e 脚本。

### 9.1 站点结构

- 全局外壳：`src/docs/SiteHeader.vue`（品牌、主导航、浅色/深色切换，主题写入 `<html data-dp-theme>`）+ `src/App.vue`。
- 组件文档：`/docs/:name`，由 `src/docs/DocLayout.vue`（左侧分类目录）与 `src/docs/pages/ComponentDocPage.vue`（标题、演示卡片、页内目录、API 表格、上一页/下一页）组成。
- 演示卡片：`src/docs/components/DemoCard.vue` 提供「显示代码 / 收起代码 / 复制代码」，`DemoGrid.vue` 在宽屏下按两列瀑布流排列、窄屏回落单列，`DocAnchor.vue` 负责右侧页内目录的滚动高亮。
- 文档数据：`src/docs/menu.ts` 维护侧边分类，`src/docs/registry.ts` 维护组件描述、示例文件与 API 表；示例源码通过 `import.meta.glob` 同时加载组件与 `?raw` 文本。
- 示例文件：`src/docs/demos/<组件路径>/*.vue`，新增示例只需放入文件并在 `registry.ts` 登记。
- 其余演示页：`/home`（全量加载）、`/components`（组件大全）、`/on-demand`（按需加载）、`/schema-demo`（数据驱动）、`/chat`、`/agent-kit`、`/cool-neutral`（Cool Neutral 主题）。一级导航只保留「组件文档」，根路径 `/` 重定向到 `/docs/button`；这些页面保留为直达路由，不在导航中展示。
- 主题持久化：`src/docs/theme.ts` 读取 localStorage 与系统偏好，切换后同步 `<html data-dp-theme>`，保证 Modal / Select / Tooltip 等 Portal 浮层继承主题。

---

## 10. 依赖关系总览

### 10.1 Vue 组件库家族

```
@dp_ui/core (reka-ui + UnoCSS)
    ↑ peerDependency
@dp_ui/chat (依赖 core 的 createInstaller，独立 --dpc-* 令牌)
    ↑ peerDependency
@dp_ui/schema (devDependency core，通过相对路径引用 core .vue 源文件)
```

### 10.2 dpui_hub 工具链

```
@dp_ui/hub_cli (Rust) ──publish──→ @dp_ui/hub_server (Rust, axum)
        │                              │
        │ use                          │ 分发 dist/source/types
        │                              ↓
        │                         @dp_ui/hub_vite (消费端 Vite 插件，构建期加载)
        │                              ↑
        │                              │ (运行时)
        │                              │
        │                         @dp_ui/hub_runtime (HubRemote 组件)
        │
        ↓
@dp_ui/hub_registry (官方真源，hubPackage 插件打包)
        │ publish
        ↓
    hub_server
        │
        ↓
@dp_ui/hub_example (消费示例，hubVite 插件构建期远程加载)
```

### 10.3 核心依赖

| 依赖 | 版本 | 用于 |
| --- | --- | --- |
| vue | ^3.5.40（workspace overrides rc） | 全部 Vue 包 |
| reka-ui | ^2.10.1 | core 组件原语 |
| unocss | ^66.7.5 | 原子化 CSS + 设计令牌 preset |
| vite | ^8.1.5 | 库模式构建 |
| vue-router | ^5.2.0 | core page 层路由 |
| typescript | ^5.9.3 | 类型 |
| vue-tsc | ^3.3.8 | 类型检查 + .d.ts 生成 |
| vitest | ^4.0.0 | 单元测试 |
| @playwright/test | ^1.50.0 | playground E2E |
| oxlint / oxfmt | lint / format | 代码质量 |

### 10.4 pnpm workspace 配置

[pnpm-workspace.yaml](file:///d:/projects/hs/codes/dp/dp_ui/pnpm-workspace.yaml)：

- `packages/*` 为 workspace 包
- `allowBuilds` 列出允许构建的依赖
- `overrides`：vue 及 @vue/* 全部 override 为 `rc`
- `peerDependencyRules.allowAny`：允许 vue 任意版本

[.npmrc](file:///d:/projects/hs/codes/dp/dp_ui/.npmrc)：

- `@dp_ui` scope 私有 registry
- `auto-install-peers=true`
- `link-workspace-packages=true`

---

## 11. 项目运行方式

### 11.1 环境要求

- Node.js：`^22.18.0 || >=24.12.0`（见各包 engines）
- pnpm（workspace）
- Rust toolchain（仅 hub_cli / hub_server 构建需要）

### 11.2 安装

在仓库根执行：

```sh
pnpm install
```

### 11.3 常用命令（根目录）

见 [package.json](file:///d:/projects/hs/codes/dp/dp_ui/package.json) scripts：

```sh
# 演示应用
pnpm dev:web                       # 启动 playground（http://localhost:5173）

# @dp_ui/core
pnpm build:lib                     # 构建 @dp_ui/core（dist/）
pnpm type-check                    # @dp_ui/core 类型检查
pnpm test:unit                     # @dp_ui/core 单元测试
pnpm lint                          # @dp_ui/core lint

# @dp_ui/schema
pnpm type-check:schema             # 类型检查
pnpm test:schema                   # 单元测试
pnpm lint:schema                   # lint

# @dp_ui/chat
pnpm type-check:chat               # 类型检查
pnpm test:chat                     # 单元测试
pnpm lint:chat                     # lint
pnpm build:chat                    # 构建 @dp_ui/chat（dist/）

# dpui_hub
pnpm hub:install-cli               # 归集平台二进制 + pnpm install
pnpm hub:use-cli                   # dpui --help
pnpm hub:build                     # 构建全部 hub 包（registry→cli→server→vite→runtime）
pnpm hub:build:cli:platforms       # 多平台二进制归集
pnpm hub:test:cli-install         # npm 安装冒烟
pnpm hub:test                      # hub_vite + hub_runtime 单元测试 + hub_server 测试
pnpm hub:e2e                       # 端到端验证
```

### 11.4 各包独立命令

```sh
# @dp_ui/core
pnpm --filter @dp_ui/core build:dist    # clean + build:lib + build:types
pnpm --filter @dp_ui/core test:unit
pnpm --filter @dp_ui/core type-check

# @dp_ui/schema
pnpm --filter @dp_ui/schema test:unit
pnpm --filter @dp_ui/schema type-check

# @dp_ui/chat
pnpm --filter @dp_ui/chat build:dist
pnpm --filter @dp_ui/chat test:unit

# playground
pnpm --filter dp-ui-playground dev
pnpm --filter dp-ui-playground test:e2e
```

### 11.5 全量加载接入

```ts
import { createApp } from 'vue'
import DpUi from '@dp_ui/core'
import '@dp_ui/core/style.css'

createApp(App).use(DpUi).mount('#app')
```

### 11.6 按需加载接入

```ts
// 具名导入（tree-shaking）
import { DpButton, DpPanel } from '@dp_ui/core'

// 子路径精确导入
import DpButton from '@dp_ui/core/components/button'
```

### 11.7 UnoCSS preset 接入

```ts
// 使用方 uno.config.ts
import { presetDpUi } from '@dp_ui/core/unocss'
import { defineConfig } from 'unocss'
export default defineConfig({ presets: [presetDpUi()] })
```

### 11.8 @dp_ui/schema 接入

```ts
import { reactive } from 'vue'
import { DsForm, installDpUi, defaultRegistry } from '@dp_ui/schema'
import type { DsNode } from '@dp_ui/schema'

installDpUi(defaultRegistry)  // 注册 @dp_ui/core 组件为渲染目标（一次即可）

const fields: DsNode[] = [
  { component: 'input', field: 'name', label: '姓名', rules: [{ required: true, message: '请填写姓名' }] },
  { component: 'select', field: 'city', label: '城市',
    dataSource: { options: [{ label: '北京', value: 'beijing' }, { label: '上海', value: 'shanghai' }] } },
]

const form = reactive({ name: '', city: '' })
// 模板：<DsForm :model="form" :fields="fields" :columns="2" @submit="onSubmit" />
```

---

## 12. 代码规范与测试

### 12.1 命名规范

- 组件：`Dp` 前缀 + PascalCase（`DpButton`）；chat 组件 `Dpc` 前缀（`DpcSender`）
- 文件：`DpXxx.vue`；目录 `kebab-case`
- 指令：`v-` 前缀（`v-auth`）
- composables：`useXxx`
- 类型：`DpXxxProps` / `DpXxxEmits` / `DpXxxInstance`
- 令牌：语义命名（primary/success/warning/danger/info，中性色 neutral-*）

### 12.2 代码质量

| 工具 | 用途 |
| --- | --- |
| oxlint | lint（`pnpm lint`） |
| oxfmt | format（`pnpm fmt` / `pnpm fmt:check`） |
| lint-staged | 提交前钩子（配置在各包 package.json） |

### 12.3 测试体系

| 层级 | 工具 | 覆盖 |
| --- | --- | --- |
| 单元 | Vitest + @vue/test-utils + jsdom | 组件渲染、props/emits、交互、行为组件逻辑、运行时纯函数 |
| E2E | Playwright | playground page→panel→component 交互链路、hub 端到端 |
| 接入验证 | playground | 全量/按需两种接入方式 + schema 数据驱动演示（`/schema-demo`） |

---

## 13. CI/CD 与发布

### 13.1 hub CLI 多平台构建

[.github/workflows/hub-cli-release.yml](file:///d:/projects/hs/codes/dp/dp_ui/.github/workflows/hub-cli-release.yml)

触发：`workflow_dispatch`（手动，可选 publish）或推送 tag `cli-v*`。

**流程**：

1. **build matrix**：win32-x64 / darwin-x64 / darwin-arm64 / linux-x64，各自原生 runner 上 `cargo build --release`，经 [scripts/hub-platform-pack.mjs](file:///d:/projects/hs/codes/dp/dp_ui/scripts/hub-platform-pack.mjs) 归集到 `packages/dpui_hub_cli/vendor/<os>-<arch>/`，上传 artifact
2. **merge**：下载各平台 vendor 合入单包，运行 `pnpm hub:test:cli-install` 安装冒烟，按 input.publish 决定 `npm publish @dp_ui/hub_cli`

### 13.2 平台归集脚本

[scripts/hub-platform-pack.mjs](file:///d:/projects/hs/codes/dp/dp_ui/scripts/hub-platform-pack.mjs)：

- `cargo build --release`（cwd: packages/dpui_hub_cli）
- 复制 `target/release/dpui[.exe]` 到 `vendor/<os>-<arch>/`
- 支持目标：win32-x64 / darwin-arm64 / darwin-x64 / linux-x64 / linux-arm64

### 13.3 npm 安装冒烟

[scripts/hub-cli-install-smoke.mjs](file:///d:/projects/hs/codes/dp/dp_ui/scripts/hub-cli-install-smoke.mjs)：

1. 归集当前平台二进制
2. `npm pack` @dp_ui/hub_cli 单包
3. 本地离线 `npm install`（registry 指向不可达地址）
4. 经安装后的 shim 执行 `dpui --version` / `dpui --help`，验证关键字（publish/manifest/use/init）

### 13.4 发布注意事项

- `@dp_ui/core` / `@dp_ui/chat` / `@dp_ui/video-rtc` 的 `prepublishOnly` 脚本会自动执行 `build:dist`
- `sideEffects` 只标记 CSS，保证 JS 可 tree-shaking
- `peerDependencies` 声明 vue/reka-ui/unocss，避免重复打包
- 私有包（`@dp_ui/schema` / `@dp_ui/chat` / playground / hub 包）标记 `private: true`，不发布

---

_本文档基于仓库源码分析生成，如代码变更请同步更新。_
