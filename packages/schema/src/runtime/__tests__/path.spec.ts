import { describe, expect, it } from 'vitest'
import { defaultValueFor, getPath, parsePath, setPath } from '../path'

describe('parsePath', () => {
  it('解析点路径', () => {
    expect(parsePath('user.name')).toEqual(['user', 'name'])
  })

  it('解析数组下标', () => {
    expect(parsePath('items[0].title')).toEqual(['items', 0, 'title'])
  })

  it('解析混合路径', () => {
    expect(parsePath('a[1].b.c')).toEqual(['a', 1, 'b', 'c'])
  })
})

describe('getPath / setPath', () => {
  it('读写深路径并自动创建中间对象', () => {
    const model: Record<string, unknown> = {}
    setPath(model, 'user.profile.name', 'Ada')
    expect(getPath(model, 'user.profile.name')).toBe('Ada')
    expect(getPath(model, 'user.missing')).toBeUndefined()
  })

  it('读写数组路径', () => {
    const model: Record<string, unknown> = { list: [{ id: 1 }, { id: 2 }] }
    expect(getPath(model, 'list[1].id')).toBe(2)
    setPath(model, 'list[0].id', 99)
    expect((model.list as Array<Record<string, unknown>>)[0]?.id).toBe(99)
  })
})

describe('defaultValueFor', () => {
  it('按类型返回空值回退', () => {
    expect(defaultValueFor('string')).toBe('')
    expect(defaultValueFor('boolean')).toBe(false)
    expect(defaultValueFor('number')).toBeUndefined()
    expect(defaultValueFor('any')).toBeUndefined()
  })
})
