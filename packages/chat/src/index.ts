// UnoCSS：build 模式要求入口显式导入 'uno.css' 才会生成原子类 CSS（dist/style.css）
import 'uno.css'
import './styles/index.css'

import type { Plugin } from 'vue'
import {
  DpcAttachment,
  DpcBubble,
  DpcBubbleLoading,
  DpcConfigProvider,
  DpcFileList,
  DpcHeader,
  DpcIntroduction,
  DpcLayout,
  DpcLayoutAside,
  DpcLayoutContent,
  DpcLayoutHeader,
  DpcLayoutSender,
  DpcList,
  DpcLocale,
  DpcMarkdownCard,
  DpcMention,
  DpcPopperTrigger,
  DpcPrompt,
  DpcSender,
  DpcToolbar,
} from './components'
import { createInstaller } from '@dp_ui/core'

const components = [
  // 布局 / 外壳
  DpcLayout,
  DpcLayoutAside,
  DpcLayoutContent,
  DpcLayoutHeader,
  DpcLayoutSender,
  // 聊天部件
  DpcHeader,
  DpcIntroduction,
  DpcPrompt,
  DpcList,
  DpcBubble,
  DpcBubbleLoading,
  DpcSender,
  DpcToolbar,
  // 输入增强 / 内容
  DpcAttachment,
  DpcFileList,
  DpcMarkdownCard,
  DpcMention,
  DpcPopperTrigger,
  // 国际化 / 主题
  DpcLocale,
  DpcConfigProvider,
]

/** 全量插件：`app.use(DpChat)` 注册全部组件 */
export const DpChat: Plugin = createInstaller(components)

export default DpChat

// 具名导出（配合 tree-shaking 实现按需加载）
export * from './components'
export * from './composables'
export * from './tokens'
export * from './types'
