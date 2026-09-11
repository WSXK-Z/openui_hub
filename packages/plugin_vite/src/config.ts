/**
 * 工程配置文件（同一目录下三份，各司其职）：
 * - `oui.json`：CLI 在当前目录的配置与公共默认值（type / cssStrategy / outDir / uno / peer / lockFile）；
 * - `oui.components.json`：纳入 hub 的组件清单（组件开发者），每个组件记录发布到的 hub 地址；
 * - `oui.lock.json`：使用依赖锁定（组件使用者），每个包记录固定版本与来源 hub 地址。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const PKG_CONFIG_FILE = 'oui.json'
export const COMPONENTS_FILE = 'oui.components.json'
export const LOCK_FILE = 'oui.lock.json'

/** 读 JSON 文件（缺失/畸形 → null）。 */
export function readJsonFile<T>(file: string): T | null {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

/** 工程默认配置（`oui.json`）。 */
export function readDefaults<T>(root: string): T | null {
  return readJsonFile<T>(join(root, PKG_CONFIG_FILE))
}

/** 组件清单（`oui.components.json`）。 */
export function readComponents<T>(root: string): T[] {
  const file = readJsonFile<{ components?: T[] }>(join(root, COMPONENTS_FILE))
  return Array.isArray(file?.components) ? file.components : []
}

/** 使用锁文件名：`oui.json` 的 lockFile，缺省 `oui.lock.json`。 */
export function lockFile(root: string): string {
  const defaults = readDefaults<{ lockFile?: unknown }>(root)
  return typeof defaults?.lockFile === 'string' && defaults.lockFile.trim()
    ? defaults.lockFile.trim()
    : LOCK_FILE
}
