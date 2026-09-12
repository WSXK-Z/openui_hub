/**
 * openui_hub 运行时远程加载 loader（浏览器/无构建场景）。
 *
 * 机制：ensureImportMap（幂等，尊重宿主已有 import map）→ 按需注入 css `<link>`
 * （按 **(注入目标, href)** 去重）→ `import(moduleUrl)`（模块级缓存）。远程预编译 ESM 内
 * `import "vue"` 由 import map 解析到宿主共享实例 —— 打包宿主请走 @openui_hub/plugin_vite 构建期插件。
 *
 * 只知道 (registry, name[, version]) 时用 `resolveHubPkg` 查 hub 得到 `ResolvedPkg`（见其文档）。
 *
 * 样式注入目标：缺省为 `document.head`（远程包的非作用域 CSS 会作用到整个宿主页面，
 * 历史行为）；传 `cssRoot: ShadowRoot` 时样式只进该 shadow —— 见 `<HubRemote>` 的 `isolate`。
 *
 * ensureImportMap 语义：
 * - 宿主页面已有 `<script type="importmap">`：解析其 `imports`（解析失败按空映射处理），
 *   只在缺少所需键时追加一张**仅含缺失键**的表；一个键都不缺时**不注入任何新表**。
 *   按 import map 规范后注册的表无法覆盖已有键，故**绝不覆盖宿主已有键**——`overrides`
 *   只作用于我们自己注入的键。这正是"宿主用自己实例的 vue + 我们兜底 reka-ui"的组合。
 * - `vue` 键：宿主表里没有时，用**宿主自己那份 vue**生成一个 blob 模块当目标（见 hostVueShim）——
 *   远端模块因此用上与宿主同一份 vue（单实例）；拿不到宿主 vue 时退回默认表。
 * - 文档中没有 import map：注入含 `vue`、`reka-ui` 的表（`overrides` 可覆盖默认值）。
 * - 无论哪条路径都只安装一次：并发调用共用同一个 promise，都会等到表就绪后才去 import 远端模块。
 *
 * v1 注明：动态追加 importmap 在浏览器中只影响其后的模块解析，此处以等待一帧近似；
 * 稳妥做法是宿主页面静态注入 import map。
 */

import type { Component } from 'vue'

export interface ResolvedPkg {
  version?: string
  moduleUrl: string
  cssUrls?: string[]
  /** 该包 peer 依赖的模块映射（`manifest.peer`），用作 import map 的兜底键。 */
  peer?: Record<string, string>
}

/**
 * 远程模块裸说明符的默认映射（`ensureImportMap` 的兜底表；`overrides` 可覆盖）。
 * 导出以便其它渲染边界（如 web 端 sandbox iframe 的 import map）复用同一份映射，
 * 避免 esm.sh 版本号出现第二处真相。
 */
export const DEFAULT_IMPORT_MAP: Record<string, string> = {
  vue: 'https://esm.sh/vue@3.5.13',
  'reka-ui': 'https://esm.sh/reka-ui@2.10.1',
}

let importMapReady: Promise<void> | null = null
/** 样式表去重：按「注入目标（document 或某个 shadow root）+ href」记 —— 同一 shadow 只注入一次，不同 shadow 各持一份（样式不跨 shadow 生效）。 */
const cssInjected = new WeakMap<ShadowRoot | Document, Set<string>>()
const moduleCache = new Map<string, Promise<unknown>>()

/** 宿主已有 import map 的 `imports` 合并视图（多张表时先注册者优先；解析失败按空映射处理）。 */
function collectHostImports(): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  const scripts = document.querySelectorAll('script[type="importmap"]')
  for (const script of Array.from(scripts)) {
    let imports: unknown
    try {
      const parsed = JSON.parse(script.textContent ?? '') as { imports?: unknown }
      imports = parsed && typeof parsed === 'object' ? parsed.imports : undefined
    } catch {
      imports = undefined
    }
    if (!imports || typeof imports !== 'object') continue
    for (const [key, value] of Object.entries(imports)) {
      if (!(key in merged)) merged[key] = value
    }
  }
  return merged
}

function appendImportMap(imports: Record<string, string>): void {
  const script = document.createElement('script')
  script.type = 'importmap'
  script.textContent = JSON.stringify({ imports })
  ;(document.head ?? document.documentElement).appendChild(script)
}

/**
 * 幂等写入 import map：宿主已有表时只补缺失键且不覆盖其已有键；无表时注入默认表。
 * 见文件头注释的语义说明。
 */
export function ensureImportMap(overrides: Record<string, string> = {}): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  // 首次调用的内容即最终内容；并发调用拿到同一个 promise，都会等到表就绪
  if (!importMapReady) importMapReady = installImportMap(overrides)
  return importMapReady
}

async function installImportMap(overrides: Record<string, string>): Promise<void> {
  const hasHostMap = document.querySelector('script[type="importmap"]') !== null
  const hostImports = hasHostMap ? collectHostImports() : {}
  const wanted = { ...DEFAULT_IMPORT_MAP, ...overrides }
  // 宿主自己提供 vue 就不动它；否则优先用宿主 vue 生成的 shim，最后才退回默认表
  if (!('vue' in overrides) && !('vue' in hostImports)) {
    const shim = await hostVueShim()
    if (shim) wanted['vue'] = shim
  }

  if (hasHostMap) {
    // 宿主已有表：按规范后注册无法覆盖已有键，只能补缺失键
    const missing: Record<string, string> = {}
    for (const [key, value] of Object.entries(wanted)) {
      if (!(key in hostImports)) missing[key] = value
    }
    if (Object.keys(missing).length === 0) return
    appendImportMap(missing)
  } else {
    appendImportMap(wanted)
  }
  // 近似等待一帧，允许动态 importmap 生效（v1 约定，见文件头注释）
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** 存放宿主 vue 命名空间的全局键：blob 模块取不到闭包，只能经全局拿。 */
const HOST_VUE_KEY = '__oui_hub_vue__'
/** 宿主 vue 的 blob shim（一个会话只生成一份）。 */
let hostVueShimUrl: Promise<string | null> | null = null

/**
 * 用宿主自己那份 vue 生成一个 blob 模块（`export const ref = m.ref; …`），供 import map 把 `vue`
 * 指过去：远端模块的裸 `import "vue"` 因此拿到宿主 vue 的**同一批函数对象**（两份 vue 共存会在渲染期
 * 直接崩，响应式与依赖注入也互不相通）。宿主无可解析的 vue（非打包页面、未装 vue）时返回 null。
 */
function hostVueShim(): Promise<string | null> {
  if (hostVueShimUrl) return hostVueShimUrl
  hostVueShimUrl = (async () => {
    if (typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') return null
    try {
      const ns = (await import('vue')) as Record<string, unknown>
      const lines = [`const m = globalThis[${JSON.stringify(HOST_VUE_KEY)}];`]
      for (const name of Object.keys(ns)) {
        // default 与非标识符名跳过：远端组件用的是具名导出
        if (name === 'default' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) continue
        lines.push(`export const ${name} = m[${JSON.stringify(name)}];`)
      }
      ;(globalThis as Record<string, unknown>)[HOST_VUE_KEY] = ns
      return URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/javascript' }))
    } catch {
      return null
    }
  })()
  return hostVueShimUrl
}

/**
 * 注入远程样式 `<link>`。
 * `root` 缺省为 document（挂到 head，全局生效 —— 历史行为）；给定 shadow root 时挂进该 shadow，
 * 样式既不出 shadow，也不受宿主样式影响。去重按 (目标, href)。
 */
function injectCss(href: string, root?: ShadowRoot | null): void {
  if (typeof document === 'undefined') return
  const target: ShadowRoot | Document = root ?? document
  let seen = cssInjected.get(target)
  if (!seen) {
    seen = new Set<string>()
    cssInjected.set(target, seen)
  }
  if (seen.has(href)) return
  seen.add(href)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  if (root) root.appendChild(link)
  else (document.head ?? document.documentElement).appendChild(link)
}

function resolvePkg(pkg: string | ResolvedPkg): ResolvedPkg {
  return typeof pkg === 'string' ? { moduleUrl: pkg } : pkg
}

/** `manifest.json` 中本 loader 读取的字段（发布时写入，见 server 的 `manifest.rs`）。 */
interface HubManifest {
  entry?: { module?: string; css?: string[] }
  peer?: Record<string, string>
}

/** hub 上的包定位：`registry` 为 hub 地址，`name` 形如 `@scope/name`。 */
export interface HubRef {
  registry: string
  name: string
  /** 省略时取该包在 hub 上的最新版本。 */
  version?: string
}

/** 去掉地址末尾的 `/`，避免拼出 `//` 路径。 */
function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/** 该包在 hub 上的最新版本（公开接口 `/resolve/<name>`）。 */
async function latestVersion(registry: string, name: string): Promise<string> {
  const url = `${registry}/resolve/${name}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`oui-hub: 解析 ${name} 的最新版本失败（HTTP ${res.status}）：${url}`)
  }
  const data = (await res.json()) as { version?: string }
  if (!data.version) throw new Error(`oui-hub: ${url} 未返回 version 字段`)
  return data.version
}

/**
 * 把 hub 上的包解析成可直接加载的 `ResolvedPkg`。
 * 版本省略时先查 `/resolve/<name>` 拿最新版本，再取该版本的 `manifest.json`；
 * module/css/peer 一律以 manifest 为准，消费端不猜产物路径。
 */
export async function resolveHubPkg(ref: HubRef): Promise<ResolvedPkg> {
  const registry = trimTrailingSlash(ref.registry)
  if (!registry) throw new Error('oui-hub: 缺少 registry（hub 地址）')
  if (!ref.name) throw new Error('oui-hub: 缺少 name（形如 @scope/name）')
  const version = ref.version ?? (await latestVersion(registry, ref.name))
  const base = `${registry}/v/${ref.name}@${version}`
  const res = await fetch(`${base}/manifest.json`)
  if (!res.ok) {
    throw new Error(`oui-hub: manifest 取不到（HTTP ${res.status}）：${base}/manifest.json`)
  }
  const manifest = (await res.json()) as HubManifest
  const modulePath = manifest.entry?.module
  if (!modulePath) {
    throw new Error(`oui-hub: ${ref.name}@${version} 的 manifest 未声明 entry.module`)
  }
  return {
    version,
    moduleUrl: `${base}/${modulePath}`,
    cssUrls: (manifest.entry?.css ?? []).map((path) => `${base}/${path}`),
    peer: manifest.peer,
  }
}

/**
 * hub 组件描述对象：远程模块入口（`index.ts`）的默认导出。
 * `name` 为包名（@scope/name），`title`/`description`/`meta` 为展示与扩展元信息，
 * `component` 为组件本体（SFC 的 default 或 defineComponent 返回值）。
 */
export interface HubComponentDescriptor {
  name: string
  title?: string
  description?: string
  meta?: Record<string, unknown>
  component: Component
}

/**
 * 从远程模块取组件本体：默认导出为描述对象时取 `component`；
 * 否则将默认导出（或模块本身）当作组件。违反契约（描述对象缺 component）时抢出定位信息。
 */
export function unwrapHubComponent(mod: unknown): Component {
  const dflt = (mod as { default?: unknown } | null | undefined)?.default ?? mod
  if (dflt && typeof dflt === 'object' && 'component' in dflt) {
    const comp = (dflt as { component?: Component }).component
    if (!comp) {
      throw new Error(
        'openui_hub: 入口导出的描述对象缺少 component 字段（应默认导出 { name, title?, description?, meta?, component }）',
      )
    }
    return comp
  }
  if (!dflt) {
    throw new Error(
      'openui_hub: 模块没有默认导出（应默认导出 { name, component, … } 描述对象）',
    )
  }
  return dflt as Component
}

export interface LoadRemoteOptions {
  importMapOverrides?: Record<string, string>
  /**
   * 样式注入目标：给定 shadow root 时远程样式只进该 shadow（隔离第三方全局 CSS）；
   * 缺省 / null 为 document.head（原行为，全局生效）。
   */
  cssRoot?: ShadowRoot | null
}

/** 加载远程组件：返回入口描述对象里的 `component`（Vue 组件定义）。 */
export async function loadRemote(
  pkg: string | ResolvedPkg,
  opts: LoadRemoteOptions = {},
): Promise<Component> {
  const resolved = resolvePkg(pkg)
  // 远程包 manifest 里的 peer 声明（如 reka-ui 版本）作为 import map 兜底：缺键按它取，显式 overrides 优先
  await ensureImportMap({ ...resolved.peer, ...opts.importMapOverrides })
  for (const url of resolved.cssUrls ?? []) injectCss(url, opts.cssRoot ?? null)
  let promise = moduleCache.get(resolved.moduleUrl)
  if (!promise) {
    promise = import(/* @vite-ignore */ resolved.moduleUrl).then(unwrapHubComponent)
    moduleCache.set(resolved.moduleUrl, promise)
  }
  return (await promise) as Component
}

/** 独立容器挂载（隔离 app 实例；需要宿主上下文请用 <HubRemote>）。返回卸载函数。 */
export async function mountRemote(
  container: Element,
  pkg: string | ResolvedPkg,
  props?: Record<string, unknown>,
): Promise<() => void> {
  const { createApp, h } = await import('vue')
  const comp = await loadRemote(pkg)
  const app = createApp(h(comp, props))
  app.mount(container)
  return () => {
    app.unmount()
  }
}
