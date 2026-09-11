/**
 * openui_hub 使用者（消费端）Vite 插件：构建期远程组件接入。
 *
 * 用法（宿主 vite.config）：
 * ```ts
 * import hubVite from '@openui_hub/plugin_vite'
 * export default defineConfig({ plugins: [vue(), hubVite()] })
 * ```
 * 代码内：`import { Button } from 'oui-hub:@oui/button'`
 *
 * 机制：
 * - `oui-hub:<name>[@<version>]` 虚拟导入 → 读 `<root>/oui.lock.json`（或 `oui.json` 的 lockFile）→
 *   未写版本时用该包的 `default` 版本 → 按该条目的 hub 地址取该版本 manifest（决定 module/css
 *   相对路径）→ fetch 远程预编译 ESM（磁盘缓存 node_modules/.hub-cache/，内容寻址 key）→
 *   注入远程 css；虚拟导入 → transform 阶段把裸导入（vue/reka-ui）改写为宿主解析结果。
 * - 远程模块的默认导出＝组件描述对象 `{ name, title?, description?, meta?, component }`：
 *   `import { Button } from 'oui-hub:@oui/button'` 拿具名导出的组件本体，
 *   `import desc from 'oui-hub:@oui/button'` 拿描述对象（运行时由 loadRemote 取 `component`）。
 * - 每个 lock 条目自带 hub 地址（`registry`），构建期可用 `OUI_REGISTRY` 临时改指向。
 * - 无 lock 文件时插件完全无操作（对未用远程包的项目零干扰）。
 *
 * v1 约束（写死）：远程产物为单文件 ESM + 独立 css（见 registry 构建）；远程模块内的
 * 相对导入/跨包 http 导入不处理（后者打印一次 warn）。
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'

import { lockFile, readJsonFile } from './config'

export interface LockVersion {
  /** 该版本来源 hub 地址（`oui use` 写入） */
  registry?: string
}

/** 一个包在 lock 里的记录：多版本 + `default`（不带版本号的导入指向的版本）。 */
export interface LockPackage {
  default?: string
  versions?: Record<string, LockVersion>
}

/** 某版本的产物描述（由组件发布时写入，使用端只读）。 */
export interface HubManifest {
  entry?: {
    /** ESM 产物相对路径 */
    module?: string
    /** 样式相对路径列表 */
    css?: string[]
  }
}

export interface HubLock {
  packages: Record<string, LockPackage>
}

/** 解析后的锁定目标。 */
export interface LockTarget {
  name: string
  version: string
  registry?: string
}

/** 包名 + 可选版本：`@scope/name` / `@scope/name@1.2.3`（按最后一个 `@` 切分）。 */
export function splitNameVersion(spec: string): { name: string; version?: string } {
  const at = spec.lastIndexOf('@')
  if (at > 0) return { name: spec.slice(0, at), version: spec.slice(at + 1) || undefined }
  return { name: spec }
}

/** 该版本的 hub 地址：`OUI_REGISTRY`（构建期覆盖）> lock 条目自带地址。 */
export function packageRegistry(entry: LockVersion): string | null {
  const env = process.env['OUI_REGISTRY']
  if (env && env.trim()) return env.trim().replace(/\/+$/, '')
  const reg = entry.registry?.trim()
  return reg ? reg.replace(/\/+$/, '') : null
}

/** 某版本的 manifest 地址（产物相对路径的权威来源）。 */
export function manifestUrl(registry: string, name: string, version: string): string {
  return `${registry}/v/${name}@${version}/manifest.json`
}

/**
 * 解析要加载的版本：显式版本 → 该版本；未给版本 → `default`。
 * 未锁定该包/该版本时抛出可操作的错误。
 */
export function lockTarget(lock: HubLock, spec: string): LockTarget {
  const { name, version: want } = splitNameVersion(spec)
  const pkg = lock.packages[name]
  if (!pkg) {
    throw new Error(`openui_hub: ${name} 不在 oui.lock.json 中——先运行 \`oui use ${name}\``)
  }
  const version = want ?? pkg.default
  if (!version) {
    throw new Error(
      `openui_hub: ${name} 没有默认版本——用 \`oui use ${name}\` 锁定，或写 'oui-hub:${name}@<version>'`,
    )
  }
  const entry = pkg.versions?.[version]
  if (!entry) {
    throw new Error(`openui_hub: ${name}@${version} 未锁定——先运行 \`oui use ${name}@${version}\``)
  }
  return { name, version, registry: entry.registry }
}

export const CSS_PREFIX = 'oui-hub-css:'
export const MODULE_PREFIX = 'oui-hub:'

/** sha256 hex（缓存 key / 文件名）。 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** 锁文件名：`oui.json` 的 lockFile，缺省 `oui.lock.json`。 */
export function lockFileName(root: string): string {
  return lockFile(root)
}

/** 读 lock；缺失或畸形返回 null（插件无操作）。 */
export function readLock(cwd: string): HubLock | null {
  try {
    const p = join(cwd, lockFileName(cwd))
    if (!existsSync(p)) return null
    const raw = readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw) as Partial<HubLock>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.packages ||
      typeof parsed.packages !== 'object' ||
      Array.isArray(parsed.packages)
    ) {
      return null
    }
    return parsed as HubLock
  } catch {
    return null
  }
}

/** 解析 `oui-hub:<name>[@<version>]` / `oui-hub-css:<name>[@<version>]` 形态。非本插件 id 返回 null。 */
export function parseHubSpecifier(source: string): { kind: 'module' | 'css'; spec: string } | null {
  if (source.startsWith(MODULE_PREFIX)) {
    const spec = source.slice(MODULE_PREFIX.length)
    return spec.length > 0 && !spec.includes('?') && !spec.includes('#') ? { kind: 'module', spec } : null
  }
  if (source.startsWith(CSS_PREFIX)) {
    const spec = source.slice(CSS_PREFIX.length)
    return spec.length > 0 ? { kind: 'css', spec } : null
  }
  return null
}

function moduleIdFor(spec: string): string {
  return `\0${MODULE_PREFIX}${spec}`
}
function cssIdFor(spec: string): string {
  return `\0${CSS_PREFIX}${spec}.css`
}
function specFromId(id: string, prefix: `\0${string}`): string {
  const rest = id.slice(prefix.length)
  return rest.endsWith('.css') ? rest.slice(0, -'.css'.length) : rest
}

function cacheDir(cwd: string): string {
  return join(cwd, 'node_modules', '.hub-cache')
}
function cacheFileFor(cwd: string, url: string): string {
  return join(cacheDir(cwd), `${sha256Hex(url)}.mjs`)
}

/** fetch + 磁盘缓存（v1：缓存永不失效；URL 内容寻址/版本化保证一致）。 */
async function fetchCached(cwd: string, url: string, context: { warn: (msg: string) => void }): Promise<string> {
  const file = cacheFileFor(cwd, url)
  if (existsSync(file)) {
    return readFileSync(file, 'utf8')
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) {
    throw new Error(`openui_hub: 拉取失败 ${url} → HTTP ${res.status}`)
  }
  const text = await res.text()
  try {
    mkdirSync(cacheDir(cwd), { recursive: true })
    writeFileSync(file, text, 'utf8')
  } catch {
    context.warn(`openui_hub: 缓存写入失败（不影响本次构建）: ${file}`)
  }
  return text
}

/** 解析某目标的产物 URL（读该版本 manifest）；无法确定 hub 地址或未声明入口时抛出可操作的错误。 */
async function packageAssets(
  target: LockTarget,
  manifest: (url: string) => Promise<HubManifest>,
): Promise<{ moduleUrl: string; cssUrls: string[] }> {
  const { name, version } = target
  const registry = packageRegistry(target)
  if (!registry) {
    throw new Error(
      `openui_hub: 无法确定 ${name}@${version} 的下载地址。` +
        `请用 \`oui use ${name}@${version}\` 重新锁定，或设置环境变量 OUI_REGISTRY。`,
    )
  }
  const m = await manifest(manifestUrl(registry, name, version))
  const mod = m.entry?.module
  if (!mod) {
    throw new Error(`openui_hub: ${name}@${version} 的 manifest 未声明 entry.module`)
  }
  const head = `${registry}/v/${name}@${version}`
  return {
    moduleUrl: `${head}/${mod}`,
    cssUrls: (m.entry?.css ?? []).filter((p) => !!p).map((p) => `${head}/${p}`),
  }
}

export function hubVite(): Plugin {
  let cfg: ResolvedConfig | null = null
  let lock: HubLock | null = null
  // manifest 每次构建内只取一次（同版本复用）
  const manifests = new Map<string, Promise<HubManifest>>()

  function manifest(url: string): Promise<HubManifest> {
    const hit = manifests.get(url)
    if (hit) return hit
    const pending = (async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`openui_hub: 读取 manifest 失败 ${url} → HTTP ${res.status}`)
      return (await res.json()) as HubManifest
    })()
    manifests.set(url, pending)
    return pending
  }

  return {
    name: 'oui-hub-vite',

    configResolved(resolved) {
      cfg = resolved
      lock = readLock(resolved.root)
    },

    async resolveId(source) {
      if (!lock || !cfg) return null
      const hit = parseHubSpecifier(source)
      if (!hit) return null
      // 未锁定该包/该版本 → 返回 null（交由 vite 报模块找不到），不阻断其它插件的解析
      const parsed = splitNameVersion(hit.spec)
      const pkg = lock.packages[parsed.name]
      if (!pkg || !pkg.versions?.[parsed.version ?? pkg.default ?? '']) return null
      return hit.kind === 'module' ? moduleIdFor(hit.spec) : cssIdFor(hit.spec)
    },

    async load(id) {
      if (!lock || !cfg) return null
      const root = cfg.root
      if (id.startsWith('\0oui-hub:')) {
        const spec = specFromId(id, '\0oui-hub:')
        const target = lockTarget(lock, spec)
        const urls = await packageAssets(target, manifest)
        const code = await fetchCached(root, urls.moduleUrl, this)
        // 注入 css 虚拟导入（v1 支持首个 css；多余打印忽略）
        const css = urls.cssUrls[0]
        const head = css ? `import "${CSS_PREFIX}${spec}";\n` : ''
        return { code: `${head}${code}`, map: null }
      }
      if (id.startsWith('\0oui-hub-css:')) {
        const spec = specFromId(id, '\0oui-hub-css:')
        const target = lockTarget(lock, spec)
        const cssUrl = (await packageAssets(target, manifest)).cssUrls[0]
        if (!cssUrl) return null
        const code = await fetchCached(root, cssUrl, this)
        return { code, map: null }
      }
      return null
    },

    async transform(code, id) {
      if (!lock || !cfg || !id.startsWith('\0oui-hub:')) return null
      if (!code.includes('from "') && !/import\s+"/.test(code)) return null

      // 收集远程模块内的裸导入（静态双引号，v1 约定产物），跳过本插件注入行与相对/http
      const importRe = /(?:^|\n)\s*import\s+(?:(?:[^"'\n]*?)\s+from\s+)?"([^"\n]+)"/g
      const specs = new Set<string>()
      for (const m of code.matchAll(importRe)) {
        const spec = m[1]
        if (!spec) continue
        if (spec.startsWith(MODULE_PREFIX) || spec.startsWith(CSS_PREFIX)) continue
        if (spec.startsWith('./') || spec.startsWith('../')) continue
        if (/^https?:\/\//.test(spec)) continue
        specs.add(spec)
      }
      if (specs.size === 0) return null

      // 逐个交给宿主解析（依赖对齐：vue/reka-ui 等 → 宿主本地实例）
      const resolved = new Map<string, string>()
      for (const spec of specs) {
        try {
          const r = await this.resolve(spec, id, { skipSelf: true })
          if (r && !r.external) {
            resolved.set(spec, r.id)
          }
        } catch {
          // 保留原样，让 vite 后续报错
        }
      }
      if (resolved.size === 0) return null

      return code.replace(importRe, (whole, spec: string | undefined) => {
        if (!spec) return whole
        const target = resolved.get(spec)
        return target ? whole.replace(`"${spec}"`, `"${target}"`) : whole
      })
    },
  }
}

export default hubVite
