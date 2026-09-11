import {
  defineConfig,
  presetMini,
  transformerDirectives,
  transformerVariantGroup,
  type PresetMiniTheme,
} from 'unocss'

/**
 * 设计令牌：本平台前端用到的三组取值（圆角 / 阴影 / 字号）。
 *
 * preset-mini 的同名默认值不同 —— `rounded` 4px→6px、`rounded-sm` 2px→4px、
 * `rounded-md` 6px→8px、`text-sm` 14px→13px、`text-lg` 18px→16px；删掉会带来视觉回归。
 */
const theme: PresetMiniTheme = {
  borderRadius: { none: '0px', sm: '4px', DEFAULT: '6px', md: '8px', lg: '12px', full: '9999px' },
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  fontSize: { xs: '12px', sm: '13px', base: '14px', lg: '16px', xl: '20px' },
}

// presetMini + 两个 transformer（不开 tagify/attributify）
export default defineConfig({
  theme,
  presets: [presetMini()],
  transformers: [transformerVariantGroup(), transformerDirectives()],
})
