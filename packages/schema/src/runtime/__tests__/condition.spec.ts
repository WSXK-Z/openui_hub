import { describe, expect, it } from 'vitest'
import { evalCondition } from '../condition'

describe('evalCondition', () => {
  const model = { open: true, count: 3 }

  it('undefined → true', () => {
    expect(evalCondition(undefined, { model })).toBe(true)
  })

  it('布尔字面量', () => {
    expect(evalCondition(true, { model })).toBe(true)
    expect(evalCondition(false, { model })).toBe(false)
  })

  it('函数表达式', () => {
    expect(evalCondition(({ model: m }) => m.open === true, { model })).toBe(true)
    expect(evalCondition(({ model: m }) => (m.count as number) > 5, { model })).toBe(false)
  })
})
