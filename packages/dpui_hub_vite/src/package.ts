/**
 * hubPackage —— 组件开发者打包插件（读项目级综合配置 dpui.pkg.json）。
 *
 * 配置是一个项目一份：公共段（cli 发布配置 / 默认 type / cssStrategy / peer / outDir）
 * + 本项目全部组件的 manifest 条目 components[]。构建（一次 vite build 多入口）后，
 * 插件把每个登记的组件打成标准包：
 *   <pkgDir>/dist/<slug>.mjs + dist/style.css + manifest.json + source/** + [types/**]（types 与 dist 同级）
 * 其中 <pkgDir> = 组件条目 outDir（相对工程根）或 <cfg.outDir>/<name>@<version>
 * （name 取自 manifest，含 scope，如 pkg/@dp_ui/button@0.1.1；文件基名仍用 name 末段 slug）。
 *
 * `types`：组件条目可不写——插件按约定从 entry 推导声明路径（读 tsconfig.dts.json 的
 * rootDir/outDir，缺省 src / .dpui-hub/types；.ts/.tsx/.js → .d.ts，.mts → .d.mts，
 * .cts → .d.cts，.vue → .vue.d.ts），命中即把该声明所在目录整棵树的声明文件
 * （*.d.ts / *.d.mts / *.d.cts）复制到 <pkgDir>/types/（与 dist/ 同级），manifest 的 entry.types /
 * entry.typesFiles 记录之，供 `dpui use` 在消费端落盘精确类型。写字符串＝显式入口（缺失即
 * 构建失败），写 false＝显式不提供（不探测，消费端即 any）。
 *
 * dpui.pkg.json 结构：
 * ```json
 * {
 *   "cli": { "registry": "http://127.0.0.1:8787" },
 *   "type": "vue-component", "cssStrategy": "vanilla",
 *   "peer": { "vue": "^3.5.0" }, "outDir": "pkg",
 *   "uno": true,
 *   "components": [
 *     { "name": "@dp_ui/button", "version": "0.1.0", "entry": "src/ui/button/button.ts",
 *       "description": "…", "type": "…", "cssStrategy": "…", "outDir": "…", "peer": {…} }
 *   ]
 * }
 * ```
 * `uno: true`：组件源码可用 UnoCSS 原子类。unocss/vite 在纯库（无 HTML）构建不产出
 * css，故由本插件在 closeBundle 用项目 uno.config（vite loadConfigFromFile 加载）的
 * presets 对组件源码做原子类提取并 generate，合并进各包 style.css（presetMini 等
 * 具体值输出 → 远程自包含）。
 *
 * 用法（组件工程 vite.config）：`plugins: [vue(), hubPackage()]`
 * 产物由 `dpui publish` 直接消费；无需自定义构建脚本。
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { loadConfigFromFile, type Plugin, type UserConfig } from 'vite'

const PKG_CONFIG_FILE = 'dpui.pkg.json'
const BUILD_TMP = '.dpui-hub/.build'
/** 原子类提取时扫描的源码扩展名（组件工程 src 树）。 */
const SCAN_EXTS = new Set(['ts', 'tsx', 'vue', 'js', 'jsx'])
/** 声明产出目录名（包内，与 dist/ 同级）；manifest 的 entry.types 以此为前缀。 */
const PKG_TYPES_DIR = 'types'
/** 声明产出的 tsconfig（组件工程约定）：rootDir/outDir 决定推导出的声明路径。 */
const DTS_TSCONFIG = 'tsconfig.dts.json'
const DTS_ROOT_DEFAULT = 'src'
const DTS_OUT_DEFAULT = '.dpui-hub/types'
/** 源码扩展名 → 声明扩展名（自动推导 types 时用；未列出＝不推导）。 */
const DTS_EXT: Record<string, string> = {
  ts: '.d.ts',
  tsx: '.d.ts',
  js: '.d.ts',
  mts: '.d.mts',
  cts: '.d.cts',
  vue: '.vue.d.ts',
}

/** 项目级综合配置（cli 公共段 + 默认 + 组件清单）。 */
export interface HubPackageConfig {
  /** CLI 公共配置（发布 registry 等） */
  cli?: { registry?: string }
  type?: string
  cssStrategy?: string
  peer?: Record<string, string>
  /** 包输出根目录（相对工程根），默认 pkg */
  outDir?: string
  /** true = 组件源码使用 UnoCSS 原子类（需工程装 unocss 并配 uno.config） */
  uno?: boolean
  /** 本项目所有可发布组件 */
  components: HubComponentConfig[]
}

/** 单个组件的 manifest 配置（可继承项目级默认）。 */
export interface HubComponentConfig {
  /** 形如 @scope/name，必填（也是包的唯一标识） */
  name: string
  /** semver 版本，必填 */
  version: string
  description?: string
  type?: string
  cssStrategy?: string
  /** 包目录（相对工程根）；缺省 <cfg.outDir>/<slug>@<version> */
  outDir?: string
  peer?: Record<string, string>
  /** 组件源入口（相对工程根），必填 */
  entry: string
  /** 随包分发的源码文件清单（相对工程根）；缺省 [entry] */
  source?: string[]
  /**
   * 类型声明：字符串＝显式入口（相对工程根，所在目录整棵树的声明复制进 <pkgDir>/types/）；
   * false＝显式不提供；缺省＝按 tsconfig.dts.json 的 rootDir/outDir 从 entry 推导
   */
  types?: string | false
}

interface PkgJsonLike {
  peerDependencies?: Record<string, string>
}

function readJsonFile<T>(file: string): T | null {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

/** 包名末段作为文件基名与默认目录片段：@dp_ui/button → button */
function slugOf(name: string): string {
  const seg = name.split('/').pop() ?? name
  return seg || name
}

/** 遍历目录收集可扫描源码文件路径（忽略 node_modules/dist/.dpui-hub/pkg）。 */
function walkSources(dir: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.dpui-hub', 'pkg', '.git'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      walkSources(p, out)
    } else if (SCAN_EXTS.has(name.split('.').pop() ?? '')) {
      out.push(p)
    }
  }
}

/** 递归收集目录下的声明文件（*.d.ts / *.d.mts / *.d.cts），返回相对 base 的正斜杠路径（字典序）。 */
function collectDeclarations(base: string, dir = base, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      collectDeclarations(base, p, out)
    } else if (/\.d\.(ts|mts|cts)$/.test(name)) {
      out.push(relative(base, p).split(sep).join('/'))
    }
  }
  return out.sort()
}

/**
 * 读 tsconfig.dts.json 的 rootDir/outDir；文件缺失、JSON.parse 失败或字段未声明 → 约定默认值
 * （src / .dpui-hub/types）。返回值形如 tsconfig 中所写，相对 cfgRoot。
 */
function dtsLayout(cfgRoot: string): { rootDir: string; outDir: string } {
  const tsconfig = readJsonFile<{ compilerOptions?: { rootDir?: string; outDir?: string } }>(
    join(cfgRoot, DTS_TSCONFIG),
  )
  const opts = tsconfig?.compilerOptions ?? {}
  const rootDir = typeof opts.rootDir === 'string' && opts.rootDir ? opts.rootDir : DTS_ROOT_DEFAULT
  const outDir = typeof opts.outDir === 'string' && opts.outDir ? opts.outDir : DTS_OUT_DEFAULT
  return { rootDir, outDir }
}

/**
 * 按 tsconfig.dts.json 的 rootDir/outDir 从源码入口推导声明路径（相对 cfgRoot 的正斜杠路径；
 * 不检查文件是否存在）。入口不在 rootDir 内、无扩展名或扩展名不在 DTS_EXT 内 → null。
 */
function inferTypesEntry(cfgRoot: string, entryRel: string): string | null {
  const { rootDir, outDir } = dtsLayout(cfgRoot)
  const rel = relative(resolve(cfgRoot, rootDir), resolve(cfgRoot, entryRel))
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`)) return null
  const dot = rel.lastIndexOf('.')
  const slash = rel.lastIndexOf(sep)
  if (dot <= slash + 1) return null
  const dtsExt = DTS_EXT[rel.slice(dot + 1).toLowerCase()]
  if (!dtsExt) return null
  return join(outDir, `${rel.slice(0, dot)}${dtsExt}`).split(sep).join('/')
}

/** 从源码文本粗提取候选 token（unocss generate 只对命中的规则产出，噪音无害）。 */
function extractTokens(text: string): Set<string> {
  const out = new Set<string>()
  for (const tok of text.matchAll(/[\w:#[\]/\\-]+/g)) {
    const t = tok[0]
    if (t && t.length > 1) out.add(t)
  }
  return out
}

/** 用项目自己的 unocss（uno.config.ts 的 presets）生成原子 css；失败返回空串并提示。 */
async function generateUnoCss(cfgRoot: string, warn: (m: string) => void): Promise<string> {
  // 例外：unocss 是组件工程依赖而非本包依赖（避免 hub_vite 强依赖），运行时从项目根解析加载
  let unoMod: Record<string, unknown>
  try {
    const require = createRequire(join(cfgRoot, 'package.json'))
    const resolved = require.resolve('unocss')
    unoMod = (await import(pathToFileURL(resolved).href)) as Record<string, unknown>
  } catch {
    warn('hubPackage: uno:true 但项目未安装 unocss，跳过原子样式生成')
    return ''
  }

  let unoCfg: Record<string, unknown> = {}
  try {
    const candidates = ['uno.config.ts', 'uno.config.mjs', 'uno.config.js', 'uno.config.mts', 'unocss.config.ts']
    const unoFile = candidates.map((f) => join(cfgRoot, f)).find((f) => existsSync(f))
    if (unoFile) {
      const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, unoFile, cfgRoot)
      const config = (loaded?.config ?? {}) as Record<string, unknown>
      unoCfg = {
        presets: config['presets'],
        transformers: config['transformers'],
        content: config['content'],
        safelist: config['safelist'],
        shortcuts: config['shortcuts'],
        theme: config['theme'],
      }
    }
  } catch {
    warn('hubPackage: 读取 uno.config.* 失败，原子样式将按默认 presetMini 生成')
  }
  if (!unoCfg['presets']) {
    warn('hubPackage: 未找到可用的 uno.config.*（含 presets），跳过原子样式生成')
    return ''
  }

  // 收集 token
  const files: string[] = []
  walkSources(join(cfgRoot, 'src'), files)
  if (files.length === 0) {
    warn('hubPackage: 未找到可扫描的组件源码（src 树为空）')
    return ''
  }
  const tokens = new Set<string>()
  for (const f of files) {
    for (const t of extractTokens(readFileSync(f, 'utf8'))) tokens.add(t)
  }

  const createGenerator = unoMod['createGenerator'] as
    | ((opts: Record<string, unknown>) => { generate: (tokens?: Iterable<string>) => Promise<{ css: string }> })
    | undefined
  if (!createGenerator) {
    warn('hubPackage: unocss 缺少 createGenerator，跳过')
    return ''
  }
  const uno = await createGenerator({ cwd: cfgRoot, ...unoCfg } as Record<string, unknown>)
  const { css } = await uno.generate(tokens)
  return css
}

/** 从 `from` 向上找首个含 dpui.pkg.json 的目录；找不到回落 `from`（随后 loadConfig 会报错）。 */
function findPkgConfigDir(from: string): string {
  let dir = from
  for (;;) {
    if (existsSync(join(dir, PKG_CONFIG_FILE))) return dir
    const parent = dirname(dir)
    if (parent === dir) return from
    dir = parent
  }
}

export function hubPackage(): Plugin {
  let cfgRoot = ''

  function loadConfig(root: string): HubPackageConfig {
    const cfg = readJsonFile<HubPackageConfig>(join(root, PKG_CONFIG_FILE))
    if (!cfg || !Array.isArray(cfg.components) || cfg.components.length === 0) {
      throw new Error(
        `hubPackage: ${PKG_CONFIG_FILE} 缺少 components（本项目所有组件的清单，至少一项）。` +
          '示例见 hubPackage 头注释。',
      )
    }
    for (const c of cfg.components) {
      if (!c.entry || !c.name || !c.version) {
        throw new Error(`hubPackage: 组件条目须含 name/version/entry：${JSON.stringify(c)}`)
      }
    }
    return cfg
  }

  /** 组件的生效配置与包目录（公共默认在此合并）。 */
  function effective(cfg: HubPackageConfig, c: HubComponentConfig) {
    const type = c.type ?? cfg.type ?? 'vue-component'
    const cssStrategy = c.cssStrategy ?? cfg.cssStrategy ?? 'vanilla'
    const peer = { ...(cfg.peer ?? {}), ...(c.peer ?? {}) }
    const pkgJson = readJsonFile<PkgJsonLike>(join(cfgRoot, 'package.json')) ?? {}
    const peerMerged = { ...(pkgJson.peerDependencies ?? {}), ...peer }
    const slug = slugOf(c.name)
    // 包目录名 = manifest 的 name + 版本（含 scope，如 pkg/@dp_ui/button@0.1.1），避免不同 scope 同名组件互相覆盖
    const outDir = c.outDir
      ? resolve(cfgRoot, c.outDir)
      : resolve(cfgRoot, cfg.outDir ?? 'pkg', `${c.name}@${c.version}`)
    return { type, cssStrategy, peer: peerMerged, slug, outDir }
  }

  return {
    name: 'dpui-hub-package',

    config(userConfig: UserConfig) {
      // 工程根 = 含 dpui.pkg.json 的目录（从 vite root 向上找）；entry/source/outDir 相对它
      cfgRoot = findPkgConfigDir(resolve(userConfig.root ?? process.cwd()))
      const cfg = loadConfig(cfgRoot)

      // 多入口：每个组件一个 chunk（键 = slug，输出 dist/<slug>.mjs）
      const entries: Record<string, string> = {}
      const externals = new Set<string>(['vue'])
      for (const c of cfg.components) {
        const slug = slugOf(c.name)
        entries[slug] = resolve(cfgRoot, c.entry)
        for (const key of Object.keys({ ...(cfg.peer ?? {}), ...(c.peer ?? {}) })) {
          externals.add(key)
        }
      }

      return {
        publicDir: false,
        build: {
          outDir: resolve(cfgRoot, BUILD_TMP),
          emptyOutDir: true,
          lib: {
            entry: entries,
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.mjs`,
            cssFileName: 'style',
          },
          rollupOptions: { external: [...externals] },
          sourcemap: false,
          cssCodeSplit: false,
        },
      }
    },

    /** 构建后：按清单拆分到各组件包目录并生成各自 manifest.json。 */
    async closeBundle() {
      const cfg = loadConfig(cfgRoot)
      const buildDir = resolve(cfgRoot, BUILD_TMP)
      const builtCss = existsSync(join(buildDir, 'style.css'))
      const unoCss = cfg.uno ? await generateUnoCss(cfgRoot, (m) => this.warn(m)) : ''

      for (const c of cfg.components) {
        const { type, cssStrategy, peer, slug, outDir } = effective(cfg, c)
        const moduleRel = `dist/${slug}.mjs`
        const srcModule = join(buildDir, `${slug}.mjs`)
        if (!existsSync(srcModule)) {
          this.warn(`hubPackage: ${c.name} 产物缺失 ${slug}.mjs，跳过`)
          continue
        }
        const pkgDist = join(outDir, 'dist')
        rmSync(outDir, { recursive: true, force: true })
        mkdirSync(pkgDist, { recursive: true })
        cpSync(srcModule, join(pkgDist, `${slug}.mjs`))

        // 样式：SFC/内联 css（style.css）+ 可选 unocss 原子样式，合并后进每包 style.css
        const cssParts: string[] = []
        if (builtCss) cssParts.push(readFileSync(join(buildDir, 'style.css'), 'utf8'))
        if (unoCss.trim()) cssParts.push(unoCss)
        const css: string[] = []
        if (cssParts.length > 0) {
          writeFileSync(join(pkgDist, 'style.css'), cssParts.join('\n'), 'utf8')
          css.push('dist/style.css')
        }

        // 源码：复制 source 清单（缺省 [entry]）到 <pkgDir>/source/<原相对路径>，供 use --mode source
        const sourceFiles: string[] = []
        for (const rel of c.source ?? [c.entry]) {
          const src = resolve(cfgRoot, rel)
          if (!existsSync(src) || !statSync(src).isFile()) {
            throw new Error(
              `hubPackage: ${c.name} 的 source 路径不存在：${rel}（相对工程根；请在 dpui.pkg.json 补正）`,
            )
          }
          const dst = join(outDir, 'source', rel)
          mkdirSync(dirname(dst), { recursive: true })
          cpSync(src, dst)
          sourceFiles.push(`source/${rel}`)
        }

        // 类型声明：把 types 入口所在目录整棵树的声明文件复制到 <pkgDir>/types/（与 dist/ 同级；
        // 入口声明里对同目录/子目录声明的相对引用因此保持可解析）
        let typesSrcRel: string | undefined
        if (c.types === false) {
          typesSrcRel = undefined // 显式关闭：不探测
        } else if (typeof c.types === 'string') {
          typesSrcRel = c.types // 显式入口：缺失即报错（见下）
        } else {
          const inferred = inferTypesEntry(cfgRoot, c.entry)
          if (inferred && existsSync(resolve(cfgRoot, inferred))) {
            typesSrcRel = inferred
            console.log(`hubPackage: ${c.name} 自动带上类型声明 ← ${typesSrcRel}`)
          } else {
            console.log(
              `hubPackage: ${c.name} 未找到类型声明（期望 ${
                inferred ?? `按 tsconfig.dts.json 从 entry ${c.entry} 推导（不在 rootDir 内或扩展名不支持）`
              }）；如需关闭此探测请设 "types": false`,
            )
          }
        }

        let typesEntry: string | undefined
        let typesFiles: string[] = []
        if (typesSrcRel !== undefined) {
          const typesSrc = resolve(cfgRoot, typesSrcRel)
          if (!existsSync(typesSrc) || !statSync(typesSrc).isFile()) {
            throw new Error(
              `hubPackage: ${c.name} 的 types 路径不存在：${typesSrcRel}（相对工程根；请在 dpui.pkg.json 补正）`,
            )
          }
          const typesBase = dirname(typesSrc)
          const entryRel = relative(typesBase, typesSrc).split(sep).join('/')
          const rels = collectDeclarations(typesBase)
          if (!/\.d\.(ts|mts|cts)$/.test(entryRel) || !rels.includes(entryRel)) {
            throw new Error(
              `hubPackage: ${c.name} 的 types 入口须是声明文件（.d.ts/.d.mts/.d.cts）：${typesSrcRel}`,
            )
          }
          const pkgTypes = join(outDir, PKG_TYPES_DIR)
          for (const rel of rels) {
            const dst = join(pkgTypes, rel)
            mkdirSync(dirname(dst), { recursive: true })
            cpSync(join(typesBase, rel), dst)
          }
          typesFiles = rels.map((rel) => `${PKG_TYPES_DIR}/${rel}`)
          typesEntry = `${PKG_TYPES_DIR}/${entryRel}`
        }

        const manifest = {
          name: c.name,
          version: c.version,
          type,
          ...(c.description ? { description: c.description } : {}),
          entry: {
            module: moduleRel,
            css,
            ...(typesEntry ? { types: typesEntry, typesFiles } : {}),
          },
          cssStrategy,
          ...(Object.keys(peer).length > 0 ? { peer } : {}),
          ...(sourceFiles.length > 0 ? { source: { files: sourceFiles } } : {}),
        }
        mkdirSync(outDir, { recursive: true })
        writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
        console.log(`hubPackage: 已生成 ${c.name}@${c.version} → ${join(outDir, 'manifest.json')}`)
      }

      rmSync(resolve(cfgRoot, '.dpui-hub'), { recursive: true, force: true })
    },
  }
}
