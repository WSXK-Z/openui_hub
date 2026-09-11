// UnoCSS：build 模式要求入口显式导入 'uno.css' 才会生成原子类 CSS（dist/style.css）
import 'uno.css'
import './styles/index.css'

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
  // 通用
  DpButton,
  DpIcon,
  DpTag,
  DpDivider,
  DpCard,
  DpAvatar,
  // 布局
  DpSpace,
  DpGrid,
  DpFlex,
  // 导航
  DpTabs,
  DpBreadcrumb,
  DpSteps,
  DpPagination,
  // 数据录入
  DpInput,
  DpTextarea,
  DpInputNumber,
  DpSwitch,
  DpCheckbox,
  DpRadio,
  DpSelect,
  DpSlider,
  DpToggle,
  DpTagsInput,
  // 数据展示
  DpTable,
  DpEmpty,
  DpAccordion,
  // 反馈
  DpBadge,
  DpTooltip,
  DpPopover,
  DpAlert,
  DpSpin,
  DpSkeleton,
  DpProgress,
  DpModal,
  // 权限 / 上下文注入 / 延迟渲染 / 配置（能力类）
  DpAuth,
  DpProvide,
  DpLazy,
  DpConfigProvider,
  // 三层结构
  DpPage,
  DpLayoutBasic,
  DpLayoutSider,
  DpPanel,
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
