<script setup lang="ts">
/**
 * 远程组件预览 —— `sandbox="allow-scripts"` iframe 隔离版。
 *
 * 隔离边界从「shadow DOM（只挡 CSS）」换成 **opaque origin 的 iframe**：
 * - `sandbox` 只给 `allow-scripts`，因此 iframe 拥有独立的 JS realm 与 **不透明 origin**：
 *   发布包里的 JS 无法读写宿主 DOM / localStorage / sessionStorage（跨源访问直接抛
 *   SecurityError），其 fetch 也不带宿主凭据 —— 拿不到 admin 会话去调 hub API；
 * - 发布包里的 CSS 只注入 iframe 文档，`!important` 全局规则（`article{height:auto}`、
 *   `.grid{display:block}`、`body{padding-top}` …）够不到宿主页面、卡片与网格；
 * - 宿主 `document.head` 不再出现任何来自 hub 的 `<link rel=stylesheet>`。
 *
 * 通信（`postMessage`）：
 * - 宿主 → iframe：`{ type: 'render', token, secret, moduleUrl, cssUrls, label }`；
 *   iframe 只处理 `data.secret === <本帧随机 secret>` 的消息（secret 写在本实例的 srcdoc 里，
 *   同页其它脚本/别的预览 iframe 无从得知），且无条件要求 secret —— 没有「缺 secret 就放行」的分支；
 * - iframe → 宿主：`{ type: 'ready', token }` / `{ type: 'error', token, message }`；
 *   宿主一律校验 `event.source === iframe.contentWindow`，`token` 为宿主代际号，
 *   用于丢弃「上一次 render」的迟到应答（版本切换竞态）。
 *
 * 内容走 `srcdoc`（不新增文件/路由）：iframe 文档里自带 import map + 引导脚本，
 * 引导脚本自己挂 `cssUrls` 的 `<link>`、`import(moduleUrl)`、`createApp(...).mount(...)`。
 * Vue 模块 URL 由宿主给出（见下方 VUE_URL），iframe 内的引导脚本与远程模块因此共用
 * iframe 自己那一份 Vue 实例（不同 iframe / 与宿主 app 之间是彼此独立的实例）。
 *
 * 卡片高度固定：iframe 填满预览区（`w-full h-full border-0`），加载/失败/超时态都是
 * 覆盖在同一个预览区上的绝对定位层，不改变 `article` 的宽高。
 */
import { DEFAULT_IMPORT_MAP } from '@openui_hub/runtime'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { RemotePkg } from '../api'

const props = defineProps<{ pkg: RemotePkg | null; label: string }>()

/** 每个 iframe 实例一个随机 secret（Web Crypto；无 randomUUID 时退回 getRandomValues）。 */
function newSecret(): string {
  const c = globalThis.crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  return Array.from(c.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 本实例的 iframe 通信口令：写进本实例 srcdoc 的引导脚本，宿主下发 render 时一并带上。
 * 因此只有「知道本帧 srcdoc」的宿主侧代码能驱动它 —— 同页其它脚本或别的预览 iframe
 * 发来的 render 一律被丢弃（无法让别人的卡片加载任意模块 / 注入任意 CSS）。
 */
const SECRET = newSecret()

/**
 * iframe 的 import map 里 `vue` 指向的宿主模块：
 * dev 是 Vite 直接服务的 shim 源文件，prod 是构建产物里的同名 shim chunk
 * （vite.config.ts 的 remoteVueShim 插件 + 固定 chunk 名保证两者都存在）。
 */
const VUE_URL = new URL(
  import.meta.env.DEV ? '/src/remote-vue-shim.ts' : '/assets/remote-vue-shim.js',
  location.href,
).href

/**
 * iframe 内引导脚本（`srcdoc`，**按实例生成**：每个实例的随机 secret 写进本帧脚本）。
 * 只用经典脚本 + 动态 `import()`：动态 import 同样走本文档的 import map。
 */
const SRCDOC = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>remote preview</title>
<style>
html,body{height:100%;margin:0;background:transparent}
body{display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}
</style>
<script type="importmap">${JSON.stringify({ imports: { ...DEFAULT_IMPORT_MAP, vue: VUE_URL } })}<\/script>
</head>
<body>
<div id="root"></div>
<script>
(function () {
  'use strict'
  // 本帧通信口令：只认携带它的 render（宿主注入，别处无从得知）
  var SECRET = ${JSON.stringify(SECRET)}
  var root = document.getElementById('root')
  var app = null
  var gen = 0
  // 最近一次 render 的宿主代际号：window 级错误用它回报，避免与 render 代数错位
  var token = null

  function post(payload) { parent.postMessage(payload, '*') }

  function fail(tok, message) {
    var text = message == null ? '未知错误' : String(message)
    post({ type: 'error', token: tok, message: text || '未知错误' })
  }

  // 远程 JS 的异步异常（含渲染期 Promise 拒绝）也要回传，否则宿主只能等到超时
  window.addEventListener('error', function (e) {
    fail(token, (e && e.message) || (e && e.error && e.error.message))
  })
  window.addEventListener('unhandledrejection', function (e) {
    var reason = e && e.reason
    fail(token, (reason && reason.message) || reason)
  })

  function render(msg) {
    token = msg.token
    var cur = ++gen
    if (app) { try { app.unmount() } catch (e) {} app = null }
    root.textContent = ''
    var stale = document.querySelectorAll('link[data-remote-css]')
    for (var i = 0; i < stale.length; i++) stale[i].parentNode.removeChild(stale[i])
    var css = msg.cssUrls || []
    for (var j = 0; j < css.length; j++) {
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.setAttribute('data-remote-css', '')
      link.href = css[j]
      document.head.appendChild(link)
    }
    Promise.all([import('vue'), import(msg.moduleUrl)]).then(function (mods) {
      if (cur !== gen) return
      var Vue = mods[0]
      var comp = mods[1].default || mods[1]
      var label = msg.label == null ? '' : String(msg.label)
      app = Vue.createApp({
        render: function () { return Vue.h(comp, null, { default: function () { return label } }) },
      })
      app.config.errorHandler = function (err) { fail(token, (err && err.message) || err) }
      app.mount(root)
      post({ type: 'ready', token: token })
    }).catch(function (e) {
      if (cur !== gen) return
      fail(token, (e && e.message) || e)
    })
  }

  window.addEventListener('message', function (ev) {
    var data = ev.data
    // secret 不符一律忽略（没有 render 之外的兼容分支，也不存在「缺 secret 放行」）
    if (!data || data.type !== 'render' || data.secret !== SECRET) return
    render(data)
  })
})()
<\/script>
</body>
</html>`

/** 渲染超时：超过此时长仍没有 ready/error 即进入错误态（模块请求被挂住等）。 */
const RENDER_TIMEOUT_MS = 8000

const iframeEl = ref<HTMLIFrameElement | null>(null)
const state = ref<'loading' | 'ready' | 'error'>('loading')
const errorMsg = ref('')
/** 重建 iframe 的键：重试 = 换一个 iframe 重新走一遍完整加载。 */
const nonce = ref(0)

/** 代际号：每次 render 递增；iframe 回传的 token 与之不符即丢弃。 */
let gen = 0
let timer: ReturnType<typeof setTimeout> | undefined

function clearTimer() {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
}

/** 下发一次 render，并开始超时计时。 */
function startRender(pkg: RemotePkg) {
  const token = ++gen
  state.value = 'loading'
  errorMsg.value = ''
  clearTimer()
  // iframe 尚未 load 时消息会丢，但 load 事件总会再下发一次，最终以最后一次为准
  iframeEl.value?.contentWindow?.postMessage(
    { type: 'render', token, secret: SECRET, moduleUrl: pkg.moduleUrl, cssUrls: pkg.cssUrls, label: props.label },
    '*',
  )
  timer = setTimeout(() => {
    if (token !== gen) return
    state.value = 'error'
    errorMsg.value = `渲染超时（${RENDER_TIMEOUT_MS / 1000}s 内未完成）`
  }, RENDER_TIMEOUT_MS)
}

function onFrameLoad() {
  if (props.pkg) startRender(props.pkg)
}

/** 只接受来自本 iframe 的消息（opaque origin 下 `event.origin === 'null'`，故以 source 为准）。 */
function onMessage(event: MessageEvent) {
  const frame = iframeEl.value
  if (!frame || event.source !== frame.contentWindow) return
  const data = event.data as { type?: unknown; token?: unknown; message?: unknown } | null
  if (!data || typeof data !== 'object' || (data.type !== 'ready' && data.type !== 'error')) return
  if (data.token !== gen) return
  clearTimer()
  if (data.type === 'ready') {
    state.value = 'ready'
    return
  }
  state.value = 'error'
  errorMsg.value = typeof data.message === 'string' && data.message ? data.message : '未知错误'
}

/** 重试：丢弃旧 iframe（其消息因 source 不匹配而被忽略）并重建。 */
function retry() {
  gen++
  clearTimer()
  state.value = 'loading'
  errorMsg.value = ''
  nonce.value++
}

watch(
  () => props.pkg,
  (pkg) => {
    if (!pkg) {
      gen++
      clearTimer()
      return
    }
    startRender(pkg)
  },
)

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => {
  gen++
  clearTimer()
  window.removeEventListener('message', onMessage)
})
</script>

<template>
  <div v-if="pkg" class="relative h-full w-full">
    <iframe
      :key="nonce"
      ref="iframeEl"
      :srcdoc="SRCDOC"
      sandbox="allow-scripts"
      title="远程组件预览"
      class="h-full w-full border-0"
      @load="onFrameLoad"
    />
    <div
      v-if="state !== 'ready'"
      class="absolute inset-0 flex items-center justify-center bg-gray-50"
    >
      <span v-if="state === 'loading'" class="text-xs text-gray-400">加载远程组件…</span>
      <span v-else class="flex w-full flex-col items-center gap-1 text-center">
        <span
          class="block max-h-8 w-full overflow-hidden break-words text-[11px] leading-4 text-red-500"
          :title="`渲染失败：${errorMsg}`"
        >渲染失败：{{ errorMsg }}</span>
        <button
          type="button"
          data-no-nav
          class="pointer-events-auto shrink-0 rounded border border-red-200 px-2 py-0.5 text-[11px] leading-none text-red-600 hover:bg-red-50"
          @click="retry"
        >
          重试
        </button>
      </span>
    </div>
  </div>
  <span v-else class="text-center text-xs text-gray-400">该版本 manifest 缺少 entry.module，无法预览</span>
</template>
