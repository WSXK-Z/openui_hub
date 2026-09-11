import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// @dp_ui/schema 库开发/测试基础配置（vitest 合并使用）
// @dp_ui/schema 自身源码用相对导入；`@` 别名专供引用的 @dp_ui/core 源码内部解析。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../core/src', import.meta.url)),
    },
  },
})
