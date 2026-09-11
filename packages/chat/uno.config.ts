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
import { presetDpChat } from './src/tokens/presetDpChat'
export default defineConfig({
  presets: [
    presetMini(),
    presetDpChat(),
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
