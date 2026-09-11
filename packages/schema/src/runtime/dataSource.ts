import type { DsDataSource, DsEvalCtx, DsOption } from '../types'

/** 请求函数：接收 URL 与请求参数，返回解析后的载荷（默认用 fetch） */
export type DsRequest = (url: string, init?: RequestInit) => Promise<unknown>

/** 组装远程请求 init */
export function buildRemoteInit(
  ds: DsDataSource,
  ctx: DsEvalCtx,
): { url: string; init: RequestInit } | undefined {
  const remote = ds.remote
  if (!remote) return undefined
  const paramsRaw =
    typeof remote.params === 'function' ? remote.params(ctx) : (remote.params ?? {})
  const isGet = (remote.method ?? 'GET') === 'GET'
  const url = new URL(remote.url, typeof window === 'undefined' ? 'http://localhost' : window.location.href)
  if (isGet) {
    for (const [key, value] of Object.entries(paramsRaw)) {
      url.searchParams.set(key, String(value))
    }
    return { url: url.toString(), init: { method: 'GET' } }
  }
  return {
    url: url.toString(),
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paramsRaw) },
  }
}

/**
 * 构建选项加载函数：返回一个加载 DsOption[] 的 Promise 工厂；
 * 无数据源时返回 null。`options`（静态/惰性）与 `remote` 二选一，options 优先。
 */
export function buildOptionsLoader(
  ds: DsDataSource | undefined,
  ctx: DsEvalCtx,
  request: DsRequest,
): (() => Promise<DsOption[]>) | null {
  if (!ds) return null
  if (ds.options !== undefined) {
    const provider = ds.options
    if (Array.isArray(provider)) return async () => provider
    return async () => {
      const result = provider()
      return result instanceof Promise ? result : result
    }
  }
  if (ds.remote) {
    return async () => {
      const built = buildRemoteInit(ds, ctx)
      if (!built) return []
      const payload = await request(built.url, built.init)
      return ds.remote?.map(payload) ?? []
    }
  }
  return null
}
