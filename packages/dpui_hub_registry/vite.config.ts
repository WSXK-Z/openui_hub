import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { hubPackage } from '@dp_ui/hub_vite'
import { defineConfig } from 'vite'

// 样例组件打包：unocss（原子类样式并入 style.css）+ hubPackage（读 dpui.pkg.json 的
// components 清单为每组件产出 dist + manifest），无自定义脚本。
export default defineConfig({
  plugins: [vue(), UnoCSS(), hubPackage()],
})
