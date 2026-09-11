import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 库开发/测试基础配置（vitest 合并使用：编译 .vue）
// 库构建走 build/build.lib.ts；演示应用为独立包 packages/playground
// 说明：@dp_ui/chat 源码内部统一使用相对导入（不依赖 @ 别名），
// 以便 playground 等消费方在 dev 通过 vite alias 直连源码。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
