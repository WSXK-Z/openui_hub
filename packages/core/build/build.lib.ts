import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import entries from './collect-entries'

/**
 * @dp_ui/core 库模式构建（多入口）：
 * - `core.mjs` / `core.cjs`：全量入口
 * - `components/<分类>/<组件>/index`：按需子路径入口
 * - `page/index`、`panel/index`、`preset-core`：子路径入口
 * - `style.css`：由 UnoCSS + 库模式提取的全部样式（设计文档 §8.2 策略 A）
 */
export default defineConfig({
  // 库产物不需要 public 资源
  publicDir: false,
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: entries,
      formats: ['es', 'cjs'],
      // 提取的全部样式输出为 dist/style.css（与 exports 的 "./style.css" 对应）
      cssFileName: 'style',
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.mjs` : `${entryName}.cjs`),
    },
    rollupOptions: {
      external: ['vue', 'reka-ui', 'vue-router', 'unocss'],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    cssCodeSplit: false,
    emptyOutDir: true,
  },
})
