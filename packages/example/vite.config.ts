import vue from '@vitejs/plugin-vue'
import hubVite from '@openui_hub/plugin_vite'
import { defineConfig } from 'vite'

// 使用端工程：构建期插件接入（oui.lock.json 由 oui use 生成）
export default defineConfig({
  plugins: [vue(), hubVite()],
})
