/**
 * <HubRemote> 的远程包定位 props 与解析入口。
 *
 * 两种定位方式：
 * - `registry` + `name` [+ `version`]：组件自己查 hub，版本省略时取该包在 hub 上的最新版本；
 * - `pkg`：已拿到产物地址时直接给（可 import 的地址，或 `ResolvedPkg`）。给了 `pkg` 就不查 hub。
 */

import type { PropType } from 'vue'

import { resolveHubPkg, type ResolvedPkg } from './loader'

/** 远程包定位参数（`pkg` 与 `registry`+`name` 二选一）。 */
export interface RemoteProps {
  registry?: string
  name?: string
  version?: string
  pkg?: string | ResolvedPkg
}

export const remoteProps = {
  /** hub 地址，如 `http://127.0.0.1:8787`。 */
  registry: { type: String, default: '' },
  /** 包名，形如 `@test/button`。 */
  name: { type: String, default: '' },
  /** 版本；省略取该包在 hub 上的最新版本。 */
  version: { type: String, default: '' },
  /** 已解析的远程包：可 import 的地址，或 { moduleUrl, cssUrls?, peer? }。 */
  pkg: { type: [String, Object] as PropType<string | ResolvedPkg>, default: undefined },
}

/** 取本次要加载的目标：`pkg` 优先；否则按 `registry` + `name` + `version` 查 hub。 */
export async function resolveRemoteTarget(props: RemoteProps): Promise<string | ResolvedPkg> {
  if (props.pkg) return props.pkg
  if (!props.registry || !props.name) {
    throw new Error('oui-hub: 需要 pkg，或 registry + name（name 形如 @scope/name）')
  }
  return resolveHubPkg({
    registry: props.registry,
    name: props.name,
    version: props.version || undefined,
  })
}
