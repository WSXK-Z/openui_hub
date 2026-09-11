/**
 * dpui_hub 运行时远程加载 loader（浏览器/无构建场景）。
 *
 * 机制：ensureImportMap（幂等，尊重宿主已有 import map）→ 按需注入 css `<link>`
 * （按 **(注入目标, href)** 去重）→ `import(moduleUrl)`（模块级缓存）。远程预编译 ESM 内
 * `import "vue"` 由 import map 解析到宿主共享实例 —— 打包宿主请走 @dp_ui/hub_vite 构建期插件。
 *
 * 样式注入目标：缺省为 `document.head`（远程包的非作用域 CSS 会作用到整个宿主页面，
 * 历史行为）；传 `cssRoot: ShadowRoot` 时样式只进该 shadow —— 见 `<HubRemoteShadow>`。
 *
 * ensureImportMap 语义：
 * - 宿主页面已有 `<script type="importmap">`：解析其 `imports`（解析失败按空映射处理），
 *   只在缺少所需键时追加一张**仅含缺失键**的表；一个键都不缺时**不注入任何新表**。
 *   按 import map 规范后注册的表无法覆盖已有键，故**绝不覆盖宿主已有键**——`overrides`
 *   只作用于我们自己注入的键。这正是"宿主用自己实例的 vue + 我们兜底 reka-ui"的组合。
 * - 文档中没有 import map：注入含 `vue`、`reka-ui` 的默认表（`overrides` 可覆盖默认值）。
 * - 无论哪条路径都只处理一次（`importMapInstalled` 短路，含检测到宿主表的情形）。
 *
 * v1 注明：动态追加 importmap 在浏览器中只影响其后的模块解析，此处以等待一帧近似；
 * 稳妥做法是宿主页面静态注入 import map。
 */

import type { Component } from 'vue'

export interface ResolvedPkg {
  version?: string
  moduleUrl: string
  cssUrls?: string[]
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

let importMapInstalled = false
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
export async function ensureImportMap(
  overrides: Record<string, string> = {},
): Promise<void> {
  if (importMapInstalled || typeof document === 'undefined') return
  // 先置标志：并发调用下同步段内即完成短路
  importMapInstalled = true

  const wanted = { ...DEFAULT_IMPORT_MAP, ...overrides }
  const hasHostMap = document.querySelector('script[type="importmap"]') !== null

  if (hasHostMap) {
    // 宿主已有表：按规范后注册无法覆盖已有键，只能补缺失键
    const hostImports = collectHostImports()
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

export interface LoadRemoteOptions {
  importMapOverrides?: Record<string, string>
  /**
   * 样式注入目标：给定 shadow root 时远程样式只进该 shadow（隔离第三方全局 CSS）；
   * 缺省 / null 为 document.head（原行为，全局生效）。
   */
  cssRoot?: ShadowRoot | null
}

/** 加载远程组件：返回模块的 default 导出（Vue 组件定义）。 */
export async function loadRemote(
  pkg: string | ResolvedPkg,
  opts: LoadRemoteOptions = {},
): Promise<Component> {
  const resolved = resolvePkg(pkg)
  await ensureImportMap(opts.importMapOverrides)
  for (const url of resolved.cssUrls ?? []) injectCss(url, opts.cssRoot ?? null)
  let promise = moduleCache.get(resolved.moduleUrl)
  if (!promise) {
    promise = import(/* @vite-ignore */ resolved.moduleUrl).then(
      (mod: { default?: Component }) => mod.default ?? (mod as unknown as Component),
    )
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
