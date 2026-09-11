import { presetDpUi } from '@dp_ui/core/unocss'
import { defineConfig, presetMini, transformerDirectives, transformerVariantGroup } from 'unocss'

// 基准 packages/core/uno.config.ts：presetMini + presetDpUi + 两个 transformer（不开 tagify/attributify）
export default defineConfig({
  presets: [presetMini(), presetDpUi()],
  transformers: [transformerVariantGroup(), transformerDirectives()],
})
