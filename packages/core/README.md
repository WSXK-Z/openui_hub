# @dp_ui/core

基于 **reka-ui + UnoCSS** 的页面级 Vue 组件库，采用 **page → panel → component** 三层界面组织范式。

> 技术约束：不引入其他第三方组件库，不使用 CSS 预处理器；样式全部由 UnoCSS 与原生 CSS 变量表达。

## 特性

- **三层结构**：`DpPage`（路由容器 + 面板停靠位/Panel Group 管理）→ `DpPanel`（页面功能划分，支持浮动/拖动/缩放/持久化）→ 基础组件；界面结构布局由 `DpLayoutBasic` / `DpLayoutSider` 在页面/应用层自行组合。
- **功能分类组织**：组件按使用场景分类（通用 / 布局 / 导航 / 数据录入 / 数据展示 / 反馈，以及权限 / 上下文注入 / 延迟渲染 / 配置等），统一置于 `components/` 下，不再区分 ui / behavior 目录；组件分类参考 Naive UI。
- **全量 / 按需两种加载**：`app.use(DpUi)` 全量注册；具名导入 + tree-shaking，或 `@dp_ui/core/components/*` 子路径精确按需。
- **样式可定制**：设计令牌输出为 `--dp-*` CSS 变量，外部可通过 CSS（类 / 变量）或属性（props）便捷覆盖。
- **reka-ui 原语封装**：如 `DpTooltip` 基于 `TooltipProvider/Root/Trigger/Content`。

## 已实现组件

| 分类                        | 组件                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 通用                        | `DpButton` `DpIcon` `DpTag` `DpDivider` `DpCard` `DpAvatar`                                                             |
| 布局                        | `DpSpace` `DpGrid` `DpFlex`                                                                                             |
| 导航                        | `DpTabs` `DpBreadcrumb` `DpSteps` `DpPagination`                                                                        |
| 数据录入                    | `DpInput` `DpTextarea` `DpInputNumber` `DpSwitch` `DpCheckbox` `DpRadio` `DpSelect` `DpSlider` `DpToggle` `DpTagsInput` |
| 数据展示                    | `DpTable` `DpEmpty` `DpAccordion`                                                                                       |
| 反馈                        | `DpBadge` `DpTooltip` `DpPopover` `DpAlert` `DpSpin` `DpSkeleton` `DpProgress` `DpModal`                                |
| 权限 / 上下文 / 延迟 / 配置 | `DpAuth` `DpProvide` `DpLazy` `DpConfigProvider` + `v-auth` 指令 |
| 主题                      | `DpThemeProvider` `DpThemeSwitch` `DpThemeToggle` + `useTheme` / `useThemeController` |
| 页面结构                    | `DpPage` `DpPanel` `DpLayoutBasic` `DpLayoutSider`                                                                      |

> `reka-ui` 封装：`DpAvatar` `DpSlider` `DpToggle` `DpTagsInput` `DpAccordion` `DpTooltip` / `DpPopover` / `DpSwitch` / `DpCheckbox` / `DpRadio` / `DpSelect` / `DpTabs` / `DpProgress` / `DpModal`。
> `DpButton` 支持 `theme.ghost`（幽灵：无边框/底色、文字随 variant）与 `theme.icon`（纯图标：方形、无内边距，尺寸由对应 size 变量决定，可用 `theme.cssVars` 按实例微调），供图标类操作按钮复用。
> 完整展示见 `packages/playground`（组件大全页 `/components`）。

## 快速开始（全量加载）

```ts
import { createApp } from 'vue'
import DpUi from '@dp_ui/core'
import '@dp_ui/core/style.css'

createApp(App).use(DpUi).mount('#app')
```

模板中可直接使用全部组件与指令：

```vue
<DpButton type="primary" @click="onSave">保存</DpButton>
<DpPanel title="筛选区"> ... </DpPanel>
<DpAuth code="dashboard:view">
  <DpTag type="success">可见</DpTag>
</DpAuth>
<div v-auth="'user:edit'">仅管理员可见</div>
```

## 按需加载

方案一（推荐，零额外依赖，tree-shaking）：

```ts
import { DpButton, DpPanel } from '@dp_ui/core'
```

方案二（子路径精确导入）：

```ts
import DpButton from '@dp_ui/core/components/common/button'
import DpPanel from '@dp_ui/core/panel'
import { useTheme, DpThemeToggle, DpThemeProvider } from '@dp_ui/core/theme'
```

## 设计令牌与主题定制

设计体系与取值依据见 [docs/DESIGN_SYSTEM_CORE.md](../../docs/DESIGN_SYSTEM_CORE.md)：OKLch 语义色、4px 间距阶梯、11 级字号、chip/control/card/window 圆角、三级语义阴影与 140–480ms 动效令牌。

此外内置 **Cool Neutral** 主题适配层，可在任意容器上通过 `data-dp-theme="cool-neutral"` / `"cool-neutral-dark"` 启用（令牌映射与边界见 [docs/COOL_NEUTRAL_THEME.md](../../docs/COOL_NEUTRAL_THEME.md)）。

- **语义色**：`--dp-color-bg` / `surface` / `surface-2` / `surface-3`、`fg` / `fg-2` / `muted`、`border` / `border-strong`、`accent` / `accent-hover` / `accent-soft` / `accent-fg`、`brass`、`ok` / `warn` / `danger` / `info`。
- **兼容别名**：`primary` / `text` / `text-secondary` / `border-hover` / `success` / `warning` / `info-hover` 继续可用，内部映射到语义色。
- **形态与动效**：`--dp-radius-xs|sm|md|lg|xl`、`--dp-shadow-1|2|3`、`--dp-ring`、`--dp-dur-*`、`--dp-ease-*`。
- **暗色主题**：在任意祖先元素上设置 `data-dp-theme="dark"`，子树内所有组件自动切换。
- **主题托管**：`DpThemeProvider` 与 `DpConfigProvider` 都可用纯数据参数托管多个命名主题，`useTheme` 与 `DpThemeSwitch` / `DpThemeToggle` 必须位于其作用域内。
- **全局配置**：`app.use(DpUi, { themes, defaultTheme, themeOverrides, mode })` 提供全局默认值，组件 `comp` 优先；`provideDpThemeConfig` / `setGlobalThemeConfig` 可在运行时调整。
- **不影响 DOM 层级**：Provider 固定为 Fragment，不生成包裹元素，令牌、`data-dp-theme` 与主题类名合并到插槽根节点，被包裹内容的父级就是 Provider 的父级。
- **主题模式**：`comp.mode` 支持 `light` / `dark` / `system`（跟随系统），并可读取 `mode` / `resolvedMode` / `isDark`、调用 `setMode` / `toggleMode`。
- **主题持久化**：`comp.persist`（默认开启）把选择写入 `localStorage` 的 `comp.storageKey`（默认 `dp-ui-theme`）；初始化优先级为显式 `mode` → 已存储值 → 主题定义 → `comp.defaultMode`（默认 `system`）。
- **Portal 主题**：浮层挂到 `body` 时，用 `comp.applyTo="document"` 把解析后的主题写到 `<html>`，关闭 Provider 时恢复原值。
- **切换组件**：`DpThemeSwitch` 提供浅色 / 深色 / 跟随系统三段选择，`DpThemeToggle` 提供单按钮浅深切换；二者读写最近的主题作用域。
- **多主题**：主题定义支持 `overrides`（TS 内联令牌）与 `className`（样式块内写令牌），以及 `mode`；`useTheme()` 提供 `theme` / `themes` / `themeNames` / `setTheme`。
- **CSS 类主题**：`className` 写入插槽根节点，令牌写在 `<style>` 块中即可获得完整 CSS 补全、取色器与变量预览；TS 内联 `overrides` 只提供键补全与常见值字面量。
- **函数式作用域**：`useTheme({ themeOverrides })` 在当前组件根节点追加令牌覆盖，须位于 Provider 内；主题名与模式始终由 Provider（或全局配置）托管。
- **类型提示**：`themeOverrides` / 主题 `overrides` 使用 `DpThemeOverrides`，内置令牌键（`color-primary`、`radius`、`shadow-2`、`dur-base` 等）可直接补全，值为带 CSS 示例的类型别名。
- **读取上下文**：`useTheme()` 无参数读取最近作用域的 `themeOverrides` / `theme` / `themes` / `themeNames` / `setTheme` / `mode` / `resolvedMode` / `isDark` / `setMode` / `toggleMode`。

使用方在 `uno.config.ts` 中继承设计令牌：

```ts
import { presetDpUi } from '@dp_ui/core/unocss'
export default defineConfig({ presets: [presetDpUi()] })
```

组件级覆盖（CSS 变量 / 属性）：

```vue
<!-- 通过 prop 修改样式 -->
<DpButton size="lg" type="primary" round>提交</DpButton>

<!-- 通过 CSS 变量 / 类覆盖 -->
<DpButton type="primary" class="my-btn" style="--dp-radius: 14px; --dp-color-accent: oklch(52% 0.18 268)">
  提交
</DpButton>

<!-- 局部主题覆盖 + 主题模式 -->
<DpConfigProvider :comp="{ themeOverrides: { 'color-accent': 'oklch(52% 0.18 268)' }, mode: 'system' }">
  <DpThemeSwitch />
</DpConfigProvider>

<!-- 多主题托管：useTheme 必须在其子树内使用 -->
<DpThemeProvider :comp="{ themes: { ocean: { overrides: { 'color-accent': '#0284c7' } }, violet: { overrides: { 'color-accent': '#7c3aed' } } }, defaultTheme: 'ocean' }">
  <DpThemeSwitch />
  <!-- 子组件：const { themeNames, setTheme } = useTheme() -->
</DpThemeProvider>

<!-- 浮层与整页主题（Portal 需要 document 级属性） -->
<DpConfigProvider :comp="{ applyTo: 'document' }">
  <DpThemeToggle />
</DpConfigProvider>

<!-- 暗色主题（任意容器） -->
<section data-dp-theme="dark">
  <DpButton type="primary">提交</DpButton>
</section>
```

函数式方式（须位于 Provider 内，只追加令牌覆盖）：

```vue
<script setup lang="ts">
import { useTheme } from '@dp_ui/core'

useTheme({ themeOverrides: { 'color-accent': 'oklch(52% 0.18 268)' } })
</script>
```

全局配置（数据参数，作为所有 Provider 的默认值）：

```ts
import { createApp } from 'vue'
import DpUi from '@dp_ui/core'

createApp(App)
  .use(DpUi, {
    themes: { ocean: { className: 'theme-ocean' }, default: {} },
    defaultTheme: 'ocean',
    mode: 'system',
    persist: false,
  })
  .mount('#app')
```

```vue
<template>
  <DpThemeProvider :comp="{ themes: { ocean: { className: 'theme-ocean' } }, defaultTheme: 'ocean' }">
    <DpButton :theme="{ variant: 'primary' }">提交</DpButton>
  </DpThemeProvider>
</template>

<style>
/* 样式块内书写令牌：IDE 提供 CSS 补全、取色器与变量预览 */
.theme-ocean {
  --dp-color-primary: oklch(55% 0.16 240);
  --dp-color-accent: oklch(55% 0.16 240);
  --dp-radius: 10px;
}
</style>
```

## 目录结构

```
src/
├── index.ts                # 主入口：全量 install + 具名导出
├── page/                   # Page 层：DpPage（容器）+ DpLayoutBasic/Sider + usePage
├── panel/                  # Panel 层：DpPanel + usePanel
├── theme/                  # 主题模块：Provider / ThemeSwitch / ThemeToggle + useTheme / useThemeHost / themeConfig
├── components/
│   ├── categories.ts       # 组件分类元数据（与 Naive UI 分类一致）
│   ├── common/             # 通用：avatar / button / card / accordion / divider / icon / tag
│   ├── data-entry/         # 数据录入：input / textarea / input-number / switch / checkbox / radio / select / slider / toggle / tags-input
│   ├── data-display/       # 数据展示：table / empty
│   ├── navigation/         # 导航：tabs / breadcrumb / steps / pagination
│   ├── feedback/           # 反馈：alert / badge / modal / popover / progress / skeleton / spin / tooltip
│   ├── layout/             # 布局：flex / grid / space
│   ├── auth/               # 权限：DpAuth / useAuth / setAuthCodes / v-auth
│   ├── provide/            # 上下文注入：DpProvide / useInject
│   ├── lazy/               # 延迟渲染：DpLazy
│   └── config/             # 配置：DpConfigProvider（纯数据参数主题宿主）
├── directives/             # 指令：v-auth
├── tokens/                 # 设计令牌（亮/暗）+ presetDpUi
├── styles/index.css        # 全局 reset + --dp-* CSS 变量 + 暗色主题 + 工具类
├── types/                  # 公共类型
└── utils/                  # withInstall / createInstaller
```

`components/categories.ts` 导出 `dpComponentCategories`（Common / Data Input / Data Display / Navigation / Feedback / Layout / Capability / Theme / Page Structure）与 `findComponentCategory`，安装顺序、文档侧边栏与分类元数据保持一致。

### 组件能力对齐（Naive UI）

- **Button**：`theme.dashed / text / quaternary / circle / strong`，与原有 `variant / size / ghost / icon / round / block` 组合。
- **Tag**：`comp.checkable` + `v-model:checked`、`comp.disabled`、`theme.bordered`。
- **Card**：`cover / header-extra / footer` 插槽。
- **Avatar**：`theme.color`（背景色）、`theme.objectFit`（图片裁切）。
- **Input**：`prefix / suffix` 插槽、`comp.maxlength`、`comp.showCount`。
- **Tabs**：`theme.type`（`segment / line / card`）。
- **Pagination**：`comp.maxVisible` 页码窗口 + 省略号跳转。
- **Steps**：`comp.vertical`、`comp.status`（process / finish / error）。
- **Progress**：`theme.type`（line / circle）、`theme.status`、`theme.showIndicator`。
- **Select**：`comp.clearable`、选项 `disabled`、尺寸跟随 `theme.size`。
- **Breadcrumb**：`comp.separator`。
- **Spin / Skeleton**：`comp.description`、`comp.animated`。
- **Tooltip**：`comp.disabled`。
- **Modal**：`comp.closeOnEsc`、`comp.closable`。

## 开发（pnpm workspace）

仓库根为 pnpm workspace（`packages/*`）：`core`（npm 名 `@dp_ui/core`）为组件库，`dp-ui-playground` 为演示应用。

```sh
pnpm install                                  # 根目录安装
pnpm --filter @dp_ui/core type-check          # 类型检查
pnpm --filter @dp_ui/core test:unit           # 单元测试
pnpm --filter @dp_ui/core lint                # oxlint
pnpm --filter @dp_ui/core build:dist          # 库构建：dist/（全量 + 按需子路径 + style.css + d.ts）
pnpm --filter dp-ui-playground dev            # 启动演示应用（http://localhost:5173）
```

## 构建产物（dist）

```
dist/
├── core.mjs / core.cjs       # 全量入口
├── style.css                 # 全部样式（策略 A）
├── preset-core.mjs/.cjs      # 设计令牌 preset（@dp_ui/core/unocss）
├── page/ panel/              # 子路径入口
├── components/**/index.*     # 按需子路径入口
└── types/**                  # TypeScript 声明
```

## 三层结构约定

- **page**：路由容器，处理路由相关事务并提供页面级上下文（`usePage` 读取 title/meta）；`DpPage` 渲染面板停靠位，并通过 Panel Group 上下文管理浮动面板（注册、按名称查找、置顶、持久化命名空间）。界面结构布局由 `DpLayoutBasic` / `DpLayoutSider` 在使用方页面/应用层组合。
- **panel**：page 的组成部分，负责页面功能划分，不涉及路由显示。普通模式作为分区容器；`fixed / movable / resizable` 时进入浮动模式，支持 7 个停靠位、拖动、缩放、工具条与状态持久化。
- **component**：基础组件（按功能分类组织，含通用 / 布局 / …及权限 / 配置等能力组件）。

### Page / Panel 能力

- `DpPage`：`comp.anchors`（停靠位子集）、`comp.anchorGap`、`comp.persistNamespace`、`comp.persistStorage`；模板 ref 暴露 `getPanels / getPanel / bringToFront / getAnchor`。
- `DpPanel`：`comp.name / anchor / fixed / movable / resizable / offset / width / height / persist / showTools`；模板 ref 暴露 `reset / collapse / expand / bringToFront / setOffset / setSize / getRect`；`tools` 插槽可自定义工具条。
- 面板状态（位移、尺寸、折叠）按 `persistNamespace:persist` 写入存储，默认 localStorage，防抖 200ms。
- 浮动面板需放在 `DpPage` 内（页面提供定位上下文），页面高度由内容或 `style` 决定；`fixed` 面板脱离文档流，不会撑高页面。

示例见 `packages/playground/src/pages/HomePage.vue`（全量加载）与 `OnDemandPage.vue`（按需加载）；浮动面板示例见组件文档 `/docs/page` 与 `/docs/panel`。
