import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'hub-runtime.mjs',
    },
    rollupOptions: {
      external: ['vue'],
    },
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    sourcemap: false,
    emptyOutDir: true,
  },
})
