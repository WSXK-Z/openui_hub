import type { Preset } from 'unocss'
import { dpTheme } from './theme'

export interface DpUiPresetOptions {
  /** 预留：主题扩展点 */
  theme?: Record<string, unknown>
}

/**
 * @dp_ui/core 的 UnoCSS preset。
 *
 * 使用方在 uno.config.ts 中引入即可继承设计令牌（颜色 / 间距 / 圆角 / 阴影 / 字号）：
 * ```ts
 * import { presetDpUi } from '@dp_ui/core/unocss'
 * export default defineConfig({ presets: [presetDpUi()] })
 * ```
 */
export function presetDpUi(_options: DpUiPresetOptions = {}): Preset {
  return {
    name: 'preset-core',
    theme: dpTheme,
  }
}

export default presetDpUi
