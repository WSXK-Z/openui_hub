# @dp_ui/core

基于 **reka-ui + UnoCSS** 的页面级 Vue 组件库，采用 **page → panel → component** 三层界面组织范式。

> 技术约束：不引入其他第三方组件库，不使用 CSS 预处理器；样式全部由 UnoCSS 与原生 CSS 变量表达。

## 特性

- **三层结构**：`DpPage`（路由容器，提供页面级上下文；目前只做容器）→ `DpPanel`（页面功能划分，不感知路由）→ 基础组件；界面结构布局由 `DpLayoutBasic` / `DpLayoutSider` 在页面/应用层自行组合。
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
| 权限 / 上下文 / 延迟 / 配置 | `DpAuth` `DpProvide` `DpLazy` `DpConfigProvider` + `v-auth` 指令                                                        |
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
```

## 设计令牌与主题定制

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
<DpButton type="primary" class="my-btn" style="--dp-radius: 12px; --dp-color-primary: #0891b2">
  提交
</DpButton>

<!-- 全局 / 局部主题覆盖 -->
<DpConfigProvider :theme-overrides="{ 'color-primary': '#7c3aed' }">
  ...
</DpConfigProvider>
```

## 目录结构

```
src/
├── index.ts                # 主入口：全量 install + 具名导出
├── page/                   # Page 层：DpPage（容器）+ DpLayoutBasic/Sider + usePage
├── panel/                  # Panel 层：DpPanel + usePanel
├── components/
│   ├── common/             # 通用：button / icon / tag / divider / card / avatar
│   ├── layout/             # 布局：space / grid / flex
│   ├── navigation/         # 导航：tabs / breadcrumb / steps / pagination
│   ├── data-entry/         # 数据录入：input / textarea / input-number / switch / checkbox / radio / select
│   ├── data-display/       # 数据展示：table / empty
│   ├── feedback/           # 反馈：badge / tooltip / alert / spin / skeleton / progress / modal
│   ├── auth/               # 权限：DpAuth / useAuth / setAuthCodes / v-auth
│   ├── provide/            # 上下文注入：DpProvide / useInject
│   ├── lazy/               # 延迟渲染：DpLazy
│   └── config/             # 配置注入：DpConfigProvider / useTheme
├── directives/             # 指令：v-auth
├── tokens/                 # 设计令牌 + presetDpUi
├── styles/index.css        # 全局 reset + --dp-* CSS 变量
├── types/                  # 公共类型
└── utils/                  # withInstall / createInstaller
```

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

- **page**：路由容器，处理路由相关事务并提供页面级上下文（`usePage` 读取 title/meta）；`DpPage` 目前只做容器，界面结构布局由 `DpLayoutBasic` / `DpLayoutSider` 在使用方页面/应用层组合。
- **panel**：page 的组成部分，负责页面功能划分，不涉及路由显示。
- **component**：基础组件（按功能分类组织，含通用 / 布局 / …及权限 / 配置等能力组件）。

示例见 `packages/playground/src/pages/HomePage.vue`（全量加载）与 `OnDemandPage.vue`（按需加载）。
