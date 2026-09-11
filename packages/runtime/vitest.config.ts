import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// 允许加载兄弟包（@openui_hub/registry 构建产物 fixture）——vitest 默认 fs.allow 仅限本包根
export default defineConfig({
  server: {
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
})
