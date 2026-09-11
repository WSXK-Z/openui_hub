/**
 * npm 安装冒烟：pack @openui_hub/cli 单包 → 本地 npm install → 经 bin shim 执行 dpui。
 * 验证"通过 node 环境安装"闭环（离线 registry）。
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CLI_DIR = join(ROOT, 'packages/cli')
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(cwd, cmd, args) {
  let r
  if (process.platform === 'win32') {
    // shell 执行 .cmd：拼单命令串（避免 DEP0190 的 args+shell 告警）
    const esc = (s) => (/[\s"]/.test(s) ? `"${s.replaceAll('"', '\\"')}"` : s)
    r = spawnSync(`${cmd} ${args.map(esc).join(' ')}`, { cwd, encoding: 'utf8', shell: true })
  } else {
    r = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  }
  if (r.status !== 0) {
    console.error(`${cmd} ${args.join(' ')} 失败:\n${(r.stdout ?? '') + (r.stderr ?? '')}`.slice(0, 4000))
    process.exit(1)
  }
  return `${r.stdout ?? ''}`
}

// 0) 归集当前平台二进制（含 cargo release 构建）
run(ROOT, process.execPath, ['scripts/hub-platform-pack.mjs'])

// 1) pack 单包
const tmp = mkdtempSync(join(tmpdir(), 'hub-npm-install-'))
try {
  const packOut = run(CLI_DIR, NPM, ['pack', '--pack-destination', tmp, '--quiet']).trim().split('\n').pop()
  if (!packOut) throw new Error('npm pack 未产出 tgz')

  // 2) 本地安装（离线 registry，不触发任何外部拉取）
  const appDir = join(tmp, 'app')
  mkdirSync(appDir, { recursive: true })
  writeFileSync(join(appDir, 'package.json'), '{}', 'utf8')
  run(appDir, NPM, [
    'install', join(tmp, packOut),
    '--no-save', '--no-audit', '--no-fund', '--registry', 'http://127.0.0.1:9',
  ])

  // 3) 经安装后的 shim 执行（模拟 `dpui`）
  const shim = join(appDir, 'node_modules', '@dp_ui', 'hub_cli', 'bin', 'dpui.js')
  const version = spawnSync(process.execPath, [shim, '--version'], { encoding: 'utf8' })
  if (version.status !== 0 || !/dpui \d/.test(`${version.stdout ?? ''}`)) {
    console.error(`dpui --version 失败: ${version.status} ${version.stdout}${version.stderr}`)
    process.exit(1)
  }
  const help = spawnSync(process.execPath, [shim, '--help'], { encoding: 'utf8' })
  const helpText = `${help.stdout ?? ''}${help.stderr ?? ''}`
  for (const kw of ['publish', 'manifest', 'use', 'init']) {
    if (!helpText.includes(kw)) {
      console.error(`dpui --help 缺关键字 ${kw}:\n${helpText}`)
      process.exit(1)
    }
  }
  console.log(`[CLI-INSTALL PASS] ${version.stdout.trim()} · 单包安装后 shim 可用（vendor 内平台产物）`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
