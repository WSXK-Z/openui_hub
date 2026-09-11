/**
 * openui_hub 端到端验证：registry 构建 → server 启动 → publish → 分发断言 → 重复发布 409 →
 * oui use 生成 lock → example 构建期远程加载。任一步失败即非零退出。
 * cwd = 仓库根（hub:e2e 已保证）。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const CLI_DIR = join(ROOT, 'packages/cli')
const CLI_BIN = join(
  CLI_DIR,
  'target/release/oui' + (process.platform === 'win32' ? '.exe' : ''),
)
const SERVER_DIR = join(ROOT, 'packages/server')
const SERVER_BIN = join(SERVER_DIR, 'target/debug/openui-hub-server.exe')
const SERVER_BIN_UNIX = join(SERVER_DIR, 'target/debug/openui-hub-server')
const SERVER_EXE =
  process.env.HUB_SERVER_BIN ?? (process.platform === 'win32' ? SERVER_BIN : SERVER_BIN_UNIX)
const REGISTRY_DIR = join(ROOT, 'packages/registry')
/** 从 oui.components.json 动态取组件（版本/目录随配置，杜绝陈旧 pkg 目录误导断言） */
const pkgCfg = JSON.parse(readFileSync(join(REGISTRY_DIR, 'oui.components.json'), 'utf8'))
const pkgs = pkgCfg.components.map((c) => ({
  name: c.name,
  version: c.version,
  // 包目录 = <outDir>/<name>@<version>（含 scope）
  dir: join(REGISTRY_DIR, 'pkg', `${c.name}@${c.version}`),
}))
const BUTTON = pkgs[0]
const EXAMPLE_DIR = join(ROOT, 'packages/example')
const REGISTRY = 'http://127.0.0.1:18987'
const TOKEN = 'dev-token-e2e'

let server = null
let serverDataDir = null

function fail(msg) {
  console.error(`\n[E2E FAIL] ${msg}`)
  process.exit(1)
}

function runSync(label, cmd, args, opts = {}) {
  console.log(`\n[E2E] ${label}`)
  const res = spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: 'utf8', env: opts.env ?? process.env })
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`
  if (res.status !== 0) {
    fail(`${label} 退出码 ${res.status}\n${out.slice(0, 4000)}`)
  }
  return out
}

async function fetchText(url, timeoutMs = 3000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return { status: res.status, text: await res.text() }
  } finally {
    clearTimeout(timer)
  }
}

async function waitHealthy() {
  const deadline = Date.now() + 10_000
  for (;;) {
    try {
      const r = await fetchText(`${REGISTRY}/healthz`)
      if (r.status === 200) return
    } catch {
      /* 重试 */
    }
    if (Date.now() > deadline) fail('server /healthz 超时未就绪')
    await new Promise((r) => setTimeout(r, 200))
  }
}

function startServer() {
  // cargo test 不刷新普通 bin 产物 —— 每次启动前强制 debug 构建（增量，秒级）
  runSync('编译 server（debug）', 'cargo', ['build'], { cwd: SERVER_DIR })
  serverDataDir = mkdtempSync(join(tmpdir(), 'hub-e2e-data-'))
  server = spawn(SERVER_EXE, [], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      HUB_ADDR: '127.0.0.1:18987',
      HUB_DATA_DIR: serverDataDir,
      HUB_PUBLISH_TOKEN: TOKEN,
    },
    stdio: 'ignore',
  })
}

function stopServer() {
  return new Promise((resolve) => {
    const done = () => {
      if (server) server = null
      if (serverDataDir) {
        try {
          rmSync(serverDataDir, { recursive: true, force: true })
        } catch {
          /* Windows 句柄释放竞态：忽略 */
        }
        serverDataDir = null
      }
      resolve()
    }
    if (!server) {
      done()
      return
    }
    server.once('exit', done)
    server.kill()
    setTimeout(() => server?.kill('SIGKILL'), 1500)
    setTimeout(done, 3000) // 兜底：不因清理阻塞
  })
}

async function main() {
  try {
    // 1. registry 构建产物（先清 pkg/，杜绝陈旧包目录干扰）
    rmSync(join(REGISTRY_DIR, 'pkg'), { recursive: true, force: true })
    const built = runSync('构建样例组件包', 'pnpm', ['hub:build:registry'])
    for (const p of pkgs) {
      const slug = p.name.split('/')[1]
      for (const f of ['manifest.json', `dist/${slug}.mjs`, 'dist/style.css']) {
        if (!existsSync(join(p.dir, f))) fail(`${p.name} 产物缺失: ${f}`)
      }
    }
    // 声明产物：按 manifest（构建产物）判定，与配置写不写 types 无关
    const manifestOf = (name) =>
      JSON.parse(readFileSync(join(pkgs.find((p) => p.name === name).dir, 'manifest.json'), 'utf8'))
    const typedCfg = pkgCfg.components.find((c) => manifestOf(c.name).entry.types)
    const untypedCfg = pkgCfg.components.find((c) => !manifestOf(c.name).entry.types)
    if (!typedCfg || !untypedCfg) fail('需要同时存在有类型/无类型的组件包作为对照')
    if ('types' in typedCfg) fail('registry 的有类型组件不应再显式配 types（验证自动推导）')
    if (!built.includes(`${typedCfg.name} 自动带上类型声明`)) {
      fail(`构建日志缺少自动推导提示（${typedCfg.name}）:\n${built.slice(-2000)}`)
    }
    for (const c of pkgCfg.components) {
      const p = pkgs.find((x) => x.name === c.name && x.version === c.version)
      const manifest = manifestOf(c.name)
      if (!manifest.entry.types) continue
      if (!manifest.entry.typesFiles?.length) fail(`${c.name} manifest 缺 entry.typesFiles`)
      for (const rel of [manifest.entry.types, ...manifest.entry.typesFiles]) {
        if (!existsSync(join(p.dir, rel))) fail(`${c.name} 声明文件缺失: ${rel}`)
      }
    }
    console.log(`[E2E] 声明产物断言通过（自动推导：${typedCfg.name} 有声明 / ${untypedCfg.name} 无声明）`)

    // 2. 启动 server 并等待就绪
    startServer()
    await waitHealthy()

    // 2b. CLI 用 release 产物 → 先编译（防陈旧二进制缺新参数/逻辑）
    runSync('编译 CLI（release）', 'cargo', ['build', '--release'], { cwd: CLI_DIR })

    // 2c. 组件工程声明链路修复：删 tsconfig.dts.json + 拿掉 build 前置 → oui fix 复原且能再构建
    const dtsCfgPath = join(REGISTRY_DIR, 'tsconfig.dts.json')
    const regPkgPath = join(REGISTRY_DIR, 'package.json')
    const regPkgOrig = readFileSync(regPkgPath, 'utf8')
    const dtsCfgOrig = readFileSync(dtsCfgPath, 'utf8')
    rmSync(dtsCfgPath)
    writeFileSync(regPkgPath, regPkgOrig.replace('vue-tsc -p tsconfig.dts.json && ', ''))
    const declFix = runSync('oui fix（组件工程声明链路）', CLI_BIN, ['fix'], { cwd: REGISTRY_DIR })
    if (!declFix.includes('tsconfig.dts.json')) fail(`fix 未处理声明产出链路:\n${declFix}`)
    if (!existsSync(dtsCfgPath) || readFileSync(dtsCfgPath, 'utf8') !== dtsCfgOrig) {
      fail('fix 未按原样重建 tsconfig.dts.json')
    }
    if (readFileSync(regPkgPath, 'utf8') !== regPkgOrig) fail('fix 未复原 package.json 的 build 脚本')
    runSync('重建样例组件包（声明链路修复后）', 'pnpm', ['hub:build:registry'])
    console.log('[E2E] fix 修复组件工程声明链路断言通过（tsconfig.dts.json + build 前置）')

    // 3. publish（每组件一次，单目录模式）
    for (const p of pkgs) {
      const pub = runSync(`oui publish ${p.name}`, CLI_BIN, [
        'publish', '--dir', p.dir, '--registry', REGISTRY, '--token', TOKEN,
      ])
      if (!pub.includes('published')) fail(`publish 输出缺少 "published": ${pub}`)
    }

    // 4. 分发断言
    const idx = await fetchText(`${REGISTRY}/v/index.json`)
    const idxPkgs = (() => {
      try {
        return JSON.parse(idx.text).packages ?? []
      } catch {
        return []
      }
    })()
    for (const p of pkgs) {
      const [scope, name] = p.name.split('/')
      const found = idxPkgs.some((x) => x.scope === scope && x.name === name && x.latest === p.version)
      if (idx.status !== 200 || !found) {
        fail(`index.json 异常：${p.name} status=${idx.status} body=${idx.text.slice(0, 500)}`)
      }
      const mjs = await fetchText(`${REGISTRY}/v/${p.name}@${p.version}/dist/${name}.mjs`)
      if (mjs.status !== 200 || !mjs.text.includes('vue')) fail(`dist/${name}.mjs 不可用或内容异常`)
    }
    const css = await fetchText(`${REGISTRY}/v/${BUTTON.name}@${BUTTON.version}/dist/style.css`)
    if (css.status !== 200 || !css.text.includes('oui-btn')) fail('dist/style.css 不可用')
    console.log('[E2E] 分发断言通过（index/mjs/css）')

    // 4b. source 分发断言（源码文件经 /source/ 路由可取）
    const vueSrc = await fetchText(
      `${REGISTRY}/v/${BUTTON.name}@${BUTTON.version}/source/src/ui/button/Button.vue`,
    )
    if (vueSrc.status !== 200 || !vueSrc.text.includes('oui-btn')) {
      fail(`source Button.vue 不可用（status=${vueSrc.status}）: ${vueSrc.text.slice(0, 300)}`)
    }
    const tagPkg = pkgs.find((p) => p.name.endsWith('/tag'))
    if (tagPkg) {
      const tagSrc = await fetchText(
        `${REGISTRY}/v/${tagPkg.name}@${tagPkg.version}/source/src/ui/tag/index.ts`,
      )
      if (tagSrc.status !== 200 || !tagSrc.text.includes('defineComponent')) {
        fail(`source index.ts 不可用（status=${tagSrc.status}）`)
      }
    }
    const src404 = await fetchText(
      `${REGISTRY}/v/${BUTTON.name}@${BUTTON.version}/source/src/ui/missing.ts`,
    )
    if (src404.status !== 404) fail(`缺失 source 文件应 404（实际 ${src404.status}）`)
    console.log('[E2E] source 分发断言通过（/source/ 路由 + 404）')

    // 4c. types 分发断言（声明文件经 /types/ 路由可取——与 dist/ 同级；缺失 404）
    if (typedCfg) {
      const tp = pkgs.find((p) => p.name === typedCfg.name)
      const tm = JSON.parse(readFileSync(join(tp.dir, 'manifest.json'), 'utf8'))
      const t = await fetchText(`${REGISTRY}/v/${typedCfg.name}@${typedCfg.version}/${tm.entry.types}`)
      if (t.status !== 200 || !t.text.includes('export')) {
        fail(`声明文件不可用（status=${t.status}）: ${t.text.slice(0, 300)}`)
      }
      const t404 = await fetchText(`${REGISTRY}/v/${typedCfg.name}@${typedCfg.version}/types/nope.d.ts`)
      if (t404.status !== 404) fail(`缺失声明文件应 404（实际 ${t404.status}）`)
      console.log('[E2E] types 分发断言通过（/types/ 路由 + 404）')
    }

    // 5. 重复发布 → 409 / 退出码 1
    const dup = spawnSync(CLI_BIN, ['publish', '--dir', BUTTON.dir, '--registry', REGISTRY, '--token', TOKEN], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    const dupOut = `${dup.stdout ?? ''}${dup.stderr ?? ''}`
    if (dup.status === 0 || !dupOut.includes('already exists')) {
      fail(`重复发布未按预期失败（exit=${dup.status}）: ${dupOut}`)
    }
    console.log('[E2E] 重复发布 409 断言通过')

    // 6. oui use --mode source：复制源码到临时消费工程
    const consumer = mkdtempSync(join(tmpdir(), 'hub-consumer-'))
    try {
      const srcUse = runSync('oui use --mode source', CLI_BIN, [
        'use', BUTTON.name, '--mode', 'source', '--registry', REGISTRY,
      ], { cwd: consumer })
      if (!srcUse.includes(`已复制 2 个源文件`)) fail(`use source 输出异常: ${srcUse}`)
      const vuePath = join(consumer, 'src/components/oui/button/Button.vue')
      const tsPath = join(consumer, 'src/components/oui/button/index.ts')
      if (!existsSync(vuePath) || !readFileSync(vuePath, 'utf8').includes('oui-btn')) {
        fail('use source 未正确落盘 Button.vue（含 oui-btn）')
      }
      if (!existsSync(tsPath) || !readFileSync(tsPath, 'utf8').includes("from './Button.vue'")) {
        fail('use source 未正确落盘 index.ts（引用 Button.vue）')
      }
      console.log('[E2E] use --mode source 断言通过（源码落盘到消费工程）')
    } finally {
      rmSync(consumer, { recursive: true, force: true })
    }

    // 6b. oui create：组件模板（描述对象入口 + SFC）、登记与声明链路
    const created = mkdtempSync(join(tmpdir(), 'hub-create-'))
    try {
      writeFileSync(
        join(created, 'package.json'),
        `${JSON.stringify({ name: 'tmp-create', version: '0.0.0', private: true }, null, 2)}\n`,
      )
      writeFileSync(
        join(created, 'oui.json'),
        `${JSON.stringify(
          { type: 'vue-component', cssStrategy: 'vanilla', uno: true, peer: { vue: '^3.5.0' } },
          null,
          2,
        )}\n`,
      )
      const out = runSync(
        'oui create（临时工程）',
        CLI_BIN,
        ['create', '@e2e/widget', '--description', '临时组件', '--registry', REGISTRY, '--no-input'],
        { cwd: created },
      )
      if (!out.includes('已登记组件 @e2e/widget@')) fail(`create 未打印登记结果:\n${out}`)

      const entryFile = join(created, 'src/ui/widget/index.ts')
      const sfcFile = join(created, 'src/ui/widget/Widget.vue')
      if (!existsSync(entryFile) || !existsSync(sfcFile)) fail('create 未生成 index.ts / Widget.vue')
      const entryText = readFileSync(entryFile, 'utf8')
      for (const frag of [
        "import Widget from './Widget.vue'",
        'export { Widget }',
        'name: "@e2e/widget"',
        'component: Widget',
      ]) {
        if (!entryText.includes(frag)) fail(`入口缺少片段 ${frag}:\n${entryText}`)
      }
      if (readFileSync(sfcFile, 'utf8').includes('<style')) {
        fail('uno=true 时模板不应写样式块（原子类由构建期生成）')
      }

      const comps = JSON.parse(readFileSync(join(created, 'oui.components.json'), 'utf8'))
      const comp = comps.components?.find((c) => c.name === '@e2e/widget')
      if (!comp) fail('create 未登记组件到 oui.components.json')
      if (comp.entry !== 'src/ui/widget/index.ts') fail(`条目 entry 异常: ${comp.entry}`)
      if ((comp.source ?? []).length !== 2) fail(`条目 source 应为 2 项: ${JSON.stringify(comp.source)}`)
      if (comp.registry !== REGISTRY) fail(`条目 registry 异常: ${comp.registry}`)
      if (!existsSync(join(created, 'tsconfig.dts.json'))) fail('create 未生成 tsconfig.dts.json')

      const again = runSync('oui create（重跑幂等）', CLI_BIN, ['create', '@e2e/widget', '--no-input'], {
        cwd: created,
      })
      if (!again.includes('模板文件已是最新')) fail(`重跑未保持幂等:\n${again}`)
      console.log('[E2E] create 断言通过（模板 + 登记 + 声明链路 + 幂等）')
    } finally {
      rmSync(created, { recursive: true, force: true })
    }

    // 6c. create 产物可直接构建（真工程：registry 内一次性组件 → dist + 自动推导声明）
    {
      const compsPath = join(REGISTRY_DIR, 'oui.components.json')
      const backup = readFileSync(compsPath, 'utf8')
      const tmpSrc = join(REGISTRY_DIR, 'src/ui/tmp-widget')
      const tmpPkg = join(REGISTRY_DIR, 'pkg/@oui/tmp-widget@0.1.4')
      try {
        runSync(
          'oui create（registry 一次性组件）',
          CLI_BIN,
          ['create', '@oui/tmp-widget', '--version', '0.1.4', '--registry', REGISTRY, '--no-input'],
          { cwd: REGISTRY_DIR },
        )
        runSync('构建 registry（含一次性组件）', 'pnpm', ['hub:build:registry'])
        if (!existsSync(join(tmpPkg, 'dist/tmp-widget.mjs'))) fail('一次性组件缺 dist/tmp-widget.mjs')
        const manifest = JSON.parse(readFileSync(join(tmpPkg, 'manifest.json'), 'utf8'))
        if (!manifest.entry.types?.includes('index.d.ts')) {
          fail(`一次性组件应自动带类型声明: ${manifest.entry.types}`)
        }
        console.log('[E2E] create 产物构建断言通过（dist + 自动推导声明）')
      } finally {
        writeFileSync(compsPath, backup)
        rmSync(tmpSrc, { recursive: true, force: true })
        rmSync(tmpPkg, { recursive: true, force: true })
      }
    }

    // 7. oui use（remote 默认）→ lock + 本地类型落盘 + tsconfig paths 接线
    if (typedCfg) {
      runSync('oui use（有类型的包）', CLI_BIN, ['use', typedCfg.name, '--registry', REGISTRY], { cwd: EXAMPLE_DIR })
    }
    const useUntyped = runSync('oui use（无类型的包）', CLI_BIN, ['use', untypedCfg.name, '--registry', REGISTRY], {
      cwd: EXAMPLE_DIR,
    })
    if (!useUntyped.includes(`${untypedCfg.name}@${untypedCfg.version} 未提供类型声明`)) {
      fail(`use 无类型包未提示类型缺失:\n${useUntyped}`)
    }
    const lockPath = join(EXAMPLE_DIR, 'oui.lock.json')
    if (!existsSync(lockPath)) fail('未生成 oui.lock.json')
    const lockText = readFileSync(lockPath, 'utf8')
    if (!/"registry"\s*:/.test(lockText)) fail('lock 缺少 registry')
    const lockJson = JSON.parse(lockText)
    for (const [pkg, entry] of Object.entries(lockJson.packages ?? {})) {
      const keys = Object.keys(entry).sort().join(',')
      if (keys !== 'registry,version') {
        fail(`${pkg} 的 lock 条目只应含 version/registry（实际: ${keys}）`)
      }
    }
    if (typedCfg) {
      const typesEntry = join(EXAMPLE_DIR, 'oui-types', typedCfg.name, 'index.d.ts')
      if (!existsSync(typesEntry)) fail(`本地声明入口未落盘: ${typesEntry}`)
      const typesDir = join(EXAMPLE_DIR, 'oui-types', typedCfg.name, typedCfg.version)
      if (!existsSync(typesDir)) fail(`本地声明目录未落盘: ${typesDir}`)
      const dtsText = readFileSync(join(EXAMPLE_DIR, 'oui.d.ts'), 'utf8')
      if (!dtsText.includes('@openui_hub/plugin_vite/remote')) fail('oui.d.ts 缺通配类型引用')
      const refCfgText = readFileSync(join(EXAMPLE_DIR, 'tsconfig.oui.json'), 'utf8')
      if (!refCfgText.includes(`"oui-hub:${typedCfg.name}"`)) {
        fail(`tsconfig.oui.json 缺 paths 映射: oui-hub:${typedCfg.name}`)
      }
      console.log('[E2E] use 类型落盘断言通过（oui-types/ + tsconfig paths）')

      // 7b. 本地声明被删后 `oui fix` 必须重建（不要求用户重跑 use）
      rmSync(join(EXAMPLE_DIR, 'oui-types', typedCfg.name), { recursive: true, force: true })
      const fixed = runSync('oui fix（重建本地类型）', CLI_BIN, ['fix', '--registry', REGISTRY], {
        cwd: EXAMPLE_DIR,
      })
      if (!fixed.includes('已重建')) fail(`fix 未重建本地类型声明:\n${fixed}`)
      const lockAfterFix = JSON.parse(readFileSync(lockPath, 'utf8'))
      if (lockAfterFix.packages?.[typedCfg.name]?.version !== typedCfg.version) {
        fail('fix 不应改写 lock 条目')
      }
      if (!existsSync(join(EXAMPLE_DIR, 'oui-types', typedCfg.name, 'index.d.ts'))) {
        fail('fix 后本地类型入口仍缺失')
      }
      if (!existsSync(join(EXAMPLE_DIR, 'oui-types', typedCfg.name, typedCfg.version))) {
        fail('fix 后本地声明目录仍缺失')
      }
      console.log('[E2E] fix 重建类型断言通过（缺失 → 按 lock 版本重新拉取）')
    }

    // 8. example 构建（插件通道端到端；先清插件磁盘缓存——e2e 每次用同版本 URL 承载新内容）
    rmSync(join(EXAMPLE_DIR, 'node_modules', '.hub-cache'), { recursive: true, force: true })
    // lock 条目自带 hub 地址；构建期用 OUI_REGISTRY 改指向本次 e2e 的 registry
    runSync('构建 example', 'pnpm', ['--filter', '@openui_hub/example', 'build'], {
      env: { ...process.env, OUI_REGISTRY: REGISTRY },
    })
    const distDir = join(EXAMPLE_DIR, 'dist')
    const assets = readdirRecursive(distDir)
    const js = assets.filter((a) => a.endsWith('.js')).map((a) => readFileSync(join(distDir, a), 'utf8')).join('\n')
    const cssAll = assets.filter((a) => a.endsWith('.css')).map((a) => readFileSync(join(distDir, a), 'utf8')).join('\n')
    if (!js.includes('oui-btn')) fail('example 产物 js 未含远程组件代码（oui-btn）')
    if (!cssAll.includes('.oui-btn')) fail('example 产物 css 未含远程组件样式（.oui-btn）')
    console.log('[E2E] example 产物断言通过（远程 render js + 样式 css 已进宿主 bundle）')

    // 9. 类型提示断言（tsc 探针）：有类型的包 → 真 props 类型（误用报错）；无类型的包 → any（不报错）
    if (typedCfg) {
      const probeCfg = join(EXAMPLE_DIR, 'tsconfig.probe.json')
      const probeTs = join(EXAMPLE_DIR, '__type_probe.ts')
      writeFileSync(
        probeCfg,
        `${JSON.stringify(
          {
            extends: './tsconfig.oui.json',
            compilerOptions: { composite: false, noEmit: true },
            include: ['__type_probe.ts', 'oui.d.ts'],
          },
          null,
          2,
        )}\n`,
        'utf8',
      )
      writeFileSync(
        probeTs,
        `import { Button } from 'oui-hub:${typedCfg.name}'
import { Button as Untyped } from 'oui-hub:${untypedCfg.name}'
export const typed: InstanceType<typeof Button>['$props'] = { variant: 'nope' }
export const untyped: InstanceType<typeof Untyped>['$props'] = { variant: 'nope' }
`,
        'utf8',
      )
      try {
        let tsc
        try {
          tsc = createRequire(join(EXAMPLE_DIR, 'package.json')).resolve('typescript/bin/tsc')
        } catch {
          fail('未找到 typescript：请在 packages/example 或仓库根安装（pnpm install）')
        }
        const res = spawnSync(process.execPath, [tsc, '-p', probeCfg], { cwd: EXAMPLE_DIR, encoding: 'utf8' })
        const out = `${res.stdout ?? ''}${res.stderr ?? ''}`
        const errors = out.split(/\r?\n/).filter((l) => l.includes('error TS'))
        if (errors.length !== 1 || !errors[0].includes('__type_probe.ts') || !errors[0].includes('nope')) {
          fail(`tsc 探针预期恰好 1 个 props 类型错误（typed 包），实际 ${errors.length} 个:\n${out.slice(0, 2000)}`)
        }
        console.log('[E2E] 类型提示断言通过（typed 包 props 误用报错；untyped 包 any 不报错）')
      } finally {
        rmSync(probeCfg, { force: true })
        rmSync(probeTs, { force: true })
        rmSync(join(EXAMPLE_DIR, 'tsconfig.probe.tsbuildinfo'), { force: true })
      }
    }

    console.log('\n[E2E PASS]')
  } finally {
    await stopServer()
  }
}

function readdirRecursive(dir) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name)
      if (name.isDirectory()) walk(p)
      else out.push(p)
    }
  }
  walk(dir)
  return out.map((p) => p.slice(dir.length + 1).replaceAll('\\', '/'))
}

main().catch(async (e) => {
  await stopServer()
  fail(String(e))
})
