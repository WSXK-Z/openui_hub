import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    // 测试根目录为包根（库 src），避免被 vite 的 playground root 覆盖
    root: fileURLToPath(new URL('./', import.meta.url)),
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }),
)
