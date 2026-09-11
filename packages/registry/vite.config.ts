import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { hubPackage } from '@openui_hub/plugin_vite'
import { defineConfig } from 'vite'

// Build components with UnoCSS and the oui.json component manifest.
export default defineConfig({
  plugins: [vue(), UnoCSS(), hubPackage()],
})
