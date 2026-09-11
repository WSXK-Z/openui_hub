/**
 * openui_hub 使用者（消费端）Vite 插件：构建期远程组件接入。
 *
 * 用法（宿主 vite.config）：
 * ```ts
 * import hubVite from '@openui_hub/plugin_vite'
 * export default defineConfig({ plugins: [vue(), hubVite()] })
 * ```
 * 代码内：`import { Button } from 'dpui-hub:@dp_ui/button'`
 *
 * 机制：
 * - `dpui-hub:<name>` 虚拟导入 → 读 `<root>/dpui-hub.lock.json` → fetch 远程预编译 ESM
 *   （磁盘缓存 node_modules/.hub-cache/，内容寻址 key）→ 注入远程 css 虚拟导入 →
 *   transform 阶段把裸导入（vue/reka-ui）改写为宿主解析结果 → 依赖对齐、单 Vue 实例。
 * - 无 lock 文件时插件完全无操作（对未用远程包的项目零干扰）。
 *
 * v1 约束（写死）：远程产物为单文件 ESM + 独立 css（见 registry 构建）；远程模块内的
 * 相对导入/跨包 http 导入不处理（后者打印一次 warn）。
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'

export interface LockPackageEntry {
  version: string
  /** 相对产物路径（新格式，推荐）：实际 URL = <registry>/v/<name>@<version>/<module> */
  module?: string
  css?: string[]
  /** 旧格式：写死的绝对 URL（仍兼容） */
  moduleUrl?: string
  cssUrls?: string[]
}

export interface HubLock {
  /** 连接名（凭据在 ~/.dpui/credentials.json） */
  connection?: string
  /** 旧格式：写死的 registry */
  registry?: string
  packages: Record<string, LockPackageEntry>
}

/** 凭据文件里的连接（只读 registry；token 与本插件无关）。 */
function connectionRegistry(name?: string): string | null {
  try {
    const home = process.env['DPUI_HOME'] ?? process.env['USERPROFILE'] ?? process.env['HOME']
    if (!home) return null
    const raw = readFileSync(join(home, '.dpui', 'credentials.json'), 'utf8')
    const store = JSON.parse(raw) as {
      default?: string
      connections?: Record<string, { registry?: string }>
    }
    const key = name && name.trim() ? name.trim() : store.default
    const registry = key ? store.connections?.[key]?.registry : undefined
    return typeof registry === 'string' && registry.trim() ? registry.trim().replace(/\/+$/, '') : null
  } catch {
    return null
  }
}

/**
 * 解析 registry 基址：`DPUI_REGISTRY` > lock.connection（→ 凭据文件）> 旧 lock.registry
 * > 同目录 dpui.pkg.json 的 cli.connection / cli.registry。
 * 返回 null 表示无法确定（调用方给出明确报错）。
 */
export function resolveRegistry(root: string, lock: HubLock): string | null {
  const env = process.env['DPUI_REGISTRY']
  if (env && env.trim()) return env.trim().replace(/\/+$/, '')
  const fromConn = connectionRegistry(lock.connection)
  if (fromConn) return fromConn
  if (lock.registry && lock.registry.trim()) return lock.registry.trim().replace(/\/+$/, '')
  try {
    const cfg = JSON.parse(readFileSync(join(root, 'dpui.pkg.json'), 'utf8')) as {
      cli?: { connection?: unknown; registry?: unknown }
    }
    const viaCfgConn = connectionRegistry(typeof cfg.cli?.connection === 'string' ? cfg.cli.connection : undefined)
    if (viaCfgConn) return viaCfgConn
    if (typeof cfg.cli?.registry === 'string' && cfg.cli.registry.trim()) {
      return cfg.cli.registry.trim().replace(/\/+$/, '')
    }
  } catch {
    /* 无配置 */
  }
  return null
}

/** 取某包的 module / css 实际 URL（优先相对字段，回退旧绝对字段）。 */
export function packageUrls(
  registry: string | null,
  name: string,
  entry: LockPackageEntry,
): { moduleUrl: string; cssUrls: string[] } | null {
  const cssUrls = entry.cssUrls?.filter((u) => !!u) ?? []
  if (entry.moduleUrl && (!entry.module || registry === null)) {
    return { moduleUrl: entry.moduleUrl, cssUrls }
  }
  if (!entry.module || !registry) return null
  const head = `${registry}/v/${name}@${entry.version}`
  return {
    moduleUrl: `${head}/${entry.module}`,
    cssUrls: (entry.css ?? []).filter((p) => !!p).map((p) => `${head}/${p}`),
  }
}

export const CSS_PREFIX = 'dpui-hub-css:'
export const MODULE_PREFIX = 'dpui-hub:'

/** sha256 hex（缓存 key / 文件名）。 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** 锁文件名：取同目录 dpui.pkg.json 的 lockFile，缺省 dpui-hub.lock.json。 */
export function lockFileName(root: string): string {
  try {
    const raw = readFileSync(join(root, 'dpui.pkg.json'), 'utf8')
    const cfg = JSON.parse(raw) as { lockFile?: unknown }
    if (typeof cfg?.lockFile === 'string' && cfg.lockFile.trim()) return cfg.lockFile.trim()
  } catch {
    /* 无配置或畸形 → 用默认名 */
  }
  return 'dpui-hub.lock.json'
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

/** 解析 `dpui-hub:<name>` / `dpui-hub-css:<name>` 形态。非本插件 id 返回 null。 */
export function parseHubSpecifier(source: string): { kind: 'module' | 'css'; name: string } | null {
  if (source.startsWith(MODULE_PREFIX)) {
    const name = source.slice(MODULE_PREFIX.length)
    return name.length > 0 && !name.includes('?') && !name.includes('#') ? { kind: 'module', name } : null
  }
  if (source.startsWith(CSS_PREFIX)) {
    const name = source.slice(CSS_PREFIX.length)
    return name.length > 0 ? { kind: 'css', name } : null
  }
  return null
}

function moduleIdFor(name: string): string {
  return `\0${MODULE_PREFIX}${name}`
}
function cssIdFor(name: string): string {
  return `\0${CSS_PREFIX}${name}.css`
}
function nameFromId(id: string, prefix: `\0${string}`): string {
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

/** 解析某包的 module/css 实际 URL；无法确定 registry 时抛出可操作的错误。 */
function resolveEntryUrls(
  root: string,
  lock: HubLock,
  name: string,
  entry: LockPackageEntry,
): { moduleUrl: string; cssUrls: string[] } {
  const registry = resolveRegistry(root, lock)
  const urls = packageUrls(registry, name, entry)
  if (!urls) {
    throw new Error(
      `openui_hub: 无法确定 ${name} 的下载地址。lock 使用相对路径，需要 registry：` +
        `请设置环境变量 DPUI_REGISTRY，或执行 \`dpui login\`（连接 ${lock.connection ?? 'default'}）后重试。`,
    )
  }
  return urls
}

export function hubVite(): Plugin {
  let cfg: ResolvedConfig | null = null
  let lock: HubLock | null = null

  return {
    name: 'dpui-hub-vite',

    configResolved(resolved) {
      cfg = resolved
      lock = readLock(resolved.root)
    },

    async resolveId(source) {
      if (!lock || !cfg) return null
      const hit = parseHubSpecifier(source)
      if (!hit) return null
      if (hit.kind === 'module') {
        return lock.packages[hit.name] ? moduleIdFor(hit.name) : null
      }
      return cssIdFor(hit.name)
    },

    async load(id) {
      if (!lock || !cfg) return null
      const root = cfg.root
      if (id.startsWith('\0dpui-hub:')) {
        const name = nameFromId(id, '\0dpui-hub:')
        const entry = lock.packages[name]
        if (!entry) return null
        const urls = resolveEntryUrls(root, lock, name, entry)
        const code = await fetchCached(root, urls.moduleUrl, this)
        // 注入 css 虚拟导入（v1 支持首个 css；多余打印忽略）
        const css = urls.cssUrls[0]
        const head = css ? `import "${CSS_PREFIX}${name}";\n` : ''
        return { code: `${head}${code}`, map: null }
      }
      if (id.startsWith('\0dpui-hub-css:')) {
        const name = nameFromId(id, '\0dpui-hub-css:')
        const entry = lock.packages[name]
        if (!entry) return null
        const cssUrl = resolveEntryUrls(root, lock, name, entry).cssUrls[0]
        if (!cssUrl) return null
        const code = await fetchCached(root, cssUrl, this)
        return { code, map: null }
      }
      return null
    },

    async transform(code, id) {
      if (!lock || !cfg || !id.startsWith('\0dpui-hub:')) return null
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
