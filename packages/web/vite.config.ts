import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig, type Plugin } from 'vite'

/** 构建产物里 vue 与远程 shim 的固定 chunk 名（index.html 的 import map 指向 shim）。 */
const VUE_CHUNK = 'vendor-vue'
const SHIM_ENTRY = 'remote-vue-shim'

/** 判定是否是 vue 运行时相关模块（pnpm 路径含 .pnpm/vue@x/ 或 .pnpm/@vue+x/）。 */
function isVueModule(id: string): boolean {
  const p = id.replace(/\\/g, '/')
  if (!p.includes('/node_modules/')) return false
  return /\/node_modules\/(?:\.pnpm\/)?(?:@vue\+|vue@)/.test(p) || /\/node_modules\/@vue\//.test(p)
}

/**
 * 让远程组件与宿主共用同一个 Vue 实例。
 *
 * dev：index.html 的 import map 指向 `src/remote-vue-shim.ts`，Vite 把它解析成宿主同一份 vue 依赖模块。
 * 构建产物没有可寻址的 vue 模块 —— 把 shim 作为额外入口 + 把 vue 收进固定名 chunk，
 * 宿主与 shim 都从同一个 chunk 拿绑定，远程组件的裸 `import "vue"` 因此命中同一实例。
 */
function remoteVueShim(): Plugin {
  return {
    name: 'oui-hub-remote-vue-shim',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('"/src/remote-vue-shim.ts"', `"/assets/${SHIM_ENTRY}.js"`)
    },
  }
}

// openui_hub 使用端：直接跨域访问 hub（server CORS GET *），不做 dev proxy
export default defineConfig({
  plugins: [vue(), UnoCSS(), remoteVueShim()],
  /**
   * 预览 iframe 是 `sandbox="allow-scripts"` 的 opaque origin（请求头 `Origin: null`），
   * 它在 iframe 文档里 `import('vue')` 命中本服务的 shim/vue 模块属于**跨源模块请求**，
   * 必须由本服务回 `Access-Control-Allow-Origin`（Vite ≥6 的 server.cors 默认只放行
   * localhost 来源，不含 `null`）。这里显式放开 JS 资源；真正部署到静态服务器时，
   * 该服务器同样需要对 `/assets/*.js` 回 ACAO，否则 iframe 内无法拿到 Vue 运行时。
   */
  server: { cors: { origin: '*' } },
  preview: { cors: { origin: '*' } },
  build: {
    rollupOptions: {
      // shim 入口必须保留导出（默认会被摇树成空模块：远程组件 import 'vue' 会拿不到任何绑定）
      preserveEntrySignatures: 'strict',
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        [SHIM_ENTRY]: fileURLToPath(new URL('./src/remote-vue-shim.ts', import.meta.url)),
      },
      output: {
        manualChunks: (id) => (isVueModule(id) ? VUE_CHUNK : undefined),
        entryFileNames: (chunk) => (chunk.name === SHIM_ENTRY ? 'assets/[name].js' : 'assets/[name]-[hash].js'),
        chunkFileNames: (chunk) => (chunk.name === VUE_CHUNK ? 'assets/vue.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
