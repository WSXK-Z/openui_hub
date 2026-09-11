import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 库开发/测试基础配置（vitest 合并使用：编译 .vue + 解析 @ 别名）
// 库构建走 build/build.lib.ts；演示应用为独立包 packages/playground
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
