import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'hub-vite.mjs',
    },
    rollupOptions: {
      // 插件运行在 vite/node 侧，内置模块与 vite 本体保持 external
      external: [/^node:/, 'vite'],
    },
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    sourcemap: false,
    emptyOutDir: true,
  },
})
