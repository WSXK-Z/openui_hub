// UnoCSS：build 模式要求入口显式导入 'uno.css' 才会生成原子类 CSS（dist/style.css）
import 'uno.css'
import './styles/index.css'
import './styles/themes/cool-neutral.css'

import type { Plugin } from 'vue'
import {
  DpAccordion,
  DpAlert,
  DpAuth,
  DpAvatar,
  DpBadge,
  DpBreadcrumb,
  DpButton,
  DpCard,
  DpCheckbox,
  DpConfigProvider,
  DpDivider,
  DpEmpty,
  DpFlex,
  DpGrid,
  DpIcon,
  DpInput,
  DpInputNumber,
  DpLazy,
  DpModal,
  DpPagination,
  DpPopover,
  DpProgress,
  DpProvide,
  DpRadio,
  DpSelect,
  DpSkeleton,
  DpSlider,
  DpSpace,
  DpSpin,
  DpSteps,
  DpSwitch,
  DpTable,
  DpTabs,
  DpTag,
  DpTagsInput,
  DpTextarea,
  DpToggle,
  DpTooltip,
} from './components'
import { vAuth } from './directives'
import { DpLayoutBasic, DpLayoutSider, DpPage } from './page'
import { DpPanel } from './panel'
import { createInstaller } from './utils'

const components = [
  // 通用 Common
  DpAvatar,
  DpButton,
  DpCard,
  DpAccordion,
  DpDivider,
  DpIcon,
  DpTag,
  // 数据录入 Data Input
  DpCheckbox,
  DpInput,
  DpInputNumber,
  DpRadio,
  DpSelect,
  DpSlider,
  DpSwitch,
  DpTagsInput,
  DpTextarea,
  DpToggle,
  // 数据展示 Data Display
  DpEmpty,
  DpTable,
  // 导航 Navigation
  DpBreadcrumb,
  DpPagination,
  DpSteps,
  DpTabs,
  // 反馈 Feedback
  DpAlert,
  DpBadge,
  DpModal,
  DpPopover,
  DpProgress,
  DpSkeleton,
  DpSpin,
  DpTooltip,
  // 布局 Layout
  DpFlex,
  DpGrid,
  DpSpace,
  // 能力 Capability
  DpAuth,
  DpConfigProvider,
  DpLazy,
  DpProvide,
  // 页面结构 Page Structure
  DpPage,
  DpPanel,
  DpLayoutBasic,
  DpLayoutSider,
]

/** 全量插件：`app.use(DpUi)` 注册全部组件与指令 */
export const DpUi: Plugin = createInstaller(components, { auth: vAuth })

export default DpUi

// 具名导出（配合 tree-shaking 实现按需加载）
export * from './components'
export * from './page'
export * from './panel'
export * from './directives'
export * from './composables'
export * from './tokens'
export * from './types'
// 通用基建（供基于 core 扩展的库复用：withInstall / createInstaller / SFCWithInstall）
export * from './utils'
