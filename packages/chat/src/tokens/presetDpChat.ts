import type { Preset } from 'unocss'
import { dpcTheme } from './theme'

export interface DpChatPresetOptions {
  /** 预留：主题扩展点 */
  theme?: Record<string, unknown>
}

/**
 * @dp_ui/chat 的 UnoCSS preset。
 *
 * 使用方在 uno.config.ts 中引入即可继承设计令牌（颜色 / 间距 / 圆角 / 阴影 / 字号）：
 * ```ts
 * import { presetDpChat } from '@dp_ui/chat/unocss'
 * export default defineConfig({ presets: [presetDpChat()] })
 * ```
 */
export function presetDpChat(_options: DpChatPresetOptions = {}): Preset {
  return {
    name: 'preset-chat',
    theme: dpcTheme,
  }
}

export default presetDpChat
