import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * @dp_ui/video-rtc 库模式构建（单入口）：
 * - `dist/VideoRTC.mjs` / `dist/VideoRTC.cjs`：具名导出 VideoRTC、VideoStream
 * - `dist/style.css`：组件内 `<style scoped>` 的提取结果（对应 exports 的 "./style.css"）
 * - `dist/types`：由 tsconfig.build.json 单独产出
 */
export default defineConfig({
  // 库产物不需要 public 资源
  publicDir: false,
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      cssFileName: 'style',
      fileName: (format) => (format === 'es' ? 'VideoRTC.mjs' : 'VideoRTC.cjs'),
    },
    rollupOptions: {
      // vue 由使用方提供
      external: ['vue'],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    cssCodeSplit: false,
    emptyOutDir: true,
  },
})
