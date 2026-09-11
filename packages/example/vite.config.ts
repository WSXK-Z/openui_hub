import vue from '@vitejs/plugin-vue'
import hubVite from '@openui_hub/plugin_vite'
import { defineConfig } from 'vite'

// 使用者工程：dpui-hub 构建期接入（dpui-hub.lock.json 由 dpui use 生成）
export default defineConfig({
  plugins: [vue(), hubVite()],
})
