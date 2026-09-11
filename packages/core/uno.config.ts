import presetTagify from '@unocss/preset-tagify'
import presetLegacyCompat from '@unocss/preset-legacy-compat'
import {
  defineConfig,
  presetIcons,
  presetAttributify,
  transformerVariantGroup,
  transformerDirectives,
  presetMini,
} from 'unocss'
import { presetDpUi } from './src/tokens/presetDpUi'
export default defineConfig({
  presets: [
    presetMini(),
    presetDpUi(),
    presetTagify({ prefix: 'un-' }),
    presetAttributify({
      prefix: 'un-',
      prefixedOnly: true,
    }),
    presetLegacyCompat({
      commaStyleColorFunction: true,
      legacyColorSpace: true,
    }),
    presetIcons({}),
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
})
