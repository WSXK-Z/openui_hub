import { describe, expect, it } from 'vitest'
import { buildOptionsLoader, buildRemoteInit } from '../dataSource'
import type { DsDataSource } from '../../types/schema'

describe('buildOptionsLoader', () => {
  const ctx = { model: {} }

  it('无数据源 → null', () => {
    expect(buildOptionsLoader(undefined, ctx, async () => [])).toBeNull()
  })

  it('静态 options', async () => {
    const ds: DsDataSource = { options: [{ label: 'A', value: 'a' }] }
    const loader = buildOptionsLoader(ds, ctx, async () => [])
    expect(loader).not.toBeNull()
    expect(await loader?.()).toEqual([{ label: 'A', value: 'a' }])
  })

  it('惰性函数（含异步）', async () => {
    const ds: DsDataSource = {
      options: async () => [
        { label: 'Lazy', value: 1 },
        { label: 'Lazy2', value: 2 },
      ],
    }
    const loader = buildOptionsLoader(ds, ctx, async () => [])
    expect((await loader?.())?.length).toBe(2)
  })

  it('远程数据源经 request + map', async () => {
    const ds: DsDataSource = {
      remote: {
        url: '/api/cities',
        params: { region: 'CN' },
        map: (payload) => (payload as Array<{ name: string; id: string }>).map((p) => ({ label: p.name, value: p.id })),
      },
    }
    const seen: Array<{ url: string; init?: RequestInit }> = []
    const loader = buildOptionsLoader(ds, ctx, async (url, init) => {
      seen.push({ url, init })
      return [{ name: '北京', id: 'bj' }]
    })
    const result = await loader?.()
    expect(result).toEqual([{ label: '北京', value: 'bj' }])
    expect(seen[0]?.url).toContain('/api/cities')
  })
})

describe('buildRemoteInit', () => {
  it('GET 拼接 query', () => {
    const ds: DsDataSource = { remote: { url: 'http://x.test/api', params: { a: 1 }, map: () => [] } }
    const built = buildRemoteInit(ds, { model: {} })
    expect(built?.url).toContain('a=1')
    expect(built?.init.method).toBe('GET')
  })

  it('POST 携带 JSON body', () => {
    const ds: DsDataSource = {
      remote: { url: 'http://x.test/api', method: 'POST', params: { a: 1 }, map: () => [] },
    }
    const built = buildRemoteInit(ds, { model: {} })
    expect(built?.init.method).toBe('POST')
    expect(built?.init.body).toBe(JSON.stringify({ a: 1 }))
  })
})
