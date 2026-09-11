/**
 * 归集当前平台 dpui 二进制到单包 vendor/<os>-<arch>/。
 * 用法：node scripts/hub-platform-pack.mjs [--platform win32-x64|darwin-arm64|linux-x64|linux-arm64|darwin-x64]
 * 缺省按本机 platform/arch；其它平台由各自 CI 构建后调用本脚本并入同一包再发布。
 */

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const SUPPORTED = ['win32-x64', 'darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64']

const idx = process.argv.indexOf('--platform')
const target = idx >= 0 ? process.argv[idx + 1] : `${process.platform}-${process.arch}`
if (!SUPPORTED.includes(target)) {
  console.error(`暂不支持的目标平台: ${target}（支持: ${SUPPORTED.join(', ')}）`)
  process.exit(1)
}
const isWin = target.startsWith('win32-')
const binName = isWin ? 'dpui.exe' : 'dpui'

// 1) cargo release 构建（增量）
const res = spawnSync('cargo', ['build', '--release'], {
  cwd: join(ROOT, 'packages/dpui_hub_cli'),
  stdio: 'inherit',
})
if (res.status !== 0) process.exit(res.status ?? 1)

// 2) 归集到 vendor/<os>-<arch>/
const destDir = join(ROOT, 'packages/dpui_hub_cli/vendor', target)
mkdirSync(destDir, { recursive: true })
cpSync(join(ROOT, 'packages/dpui_hub_cli/target/release', binName), join(destDir, binName))
console.log(`已归集 ${target} → packages/dpui_hub_cli/vendor/${target}/${binName}`)
