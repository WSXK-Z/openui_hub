import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface EntryMap {
  [key: string]: string
}

const root = fileURLToPath(new URL('../', import.meta.url))
const srcDir = join(root, 'src')
const componentsDir = join(srcDir, 'components')

/**
 * 收集库构建入口：
 * - 主入口 `chat`（全量）
 * - 设计令牌 preset `preset-chat`
 * - 每个组件目录（含 .vue 或叶子目录）的子路径
 */
export function collectEntries(): EntryMap {
  const entries: EntryMap = {
    'chat': join(srcDir, 'index.ts'),
    'preset-chat': join(srcDir, 'tokens', 'presetDpChat.ts'),
  }
  walkComponents(componentsDir, entries)
  return entries
}

function walkComponents(dir: string, entries: EntryMap) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (!statSync(full).isDirectory()) continue
    const indexPath = join(full, 'index.ts')
    const files = readdirSync(full)
    const hasVueFile = files.some((file) => file.endsWith('.vue'))
    const hasSubdirs = files.some((file) => statSync(join(full, file)).isDirectory())
    if (existsSync(indexPath) && (hasVueFile || !hasSubdirs)) {
      const rel = relative(componentsDir, full).split('\\').join('/')
      entries[`components/${rel}/index`] = indexPath
    }
    walkComponents(full, entries)
  }
}

export default collectEntries()
