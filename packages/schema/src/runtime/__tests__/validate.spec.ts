import { describe, expect, it } from 'vitest'
import { collectFields, validateField, validateFields } from '../validate'
import type { DsNode } from '../../types/schema'

describe('validateField', () => {
  it('required 空值报错', async () => {
    expect(await validateField('', [{ required: true, message: '必填' }], { model: {} })).toBe('必填')
    expect(await validateField('x', [{ required: true }], { model: {} })).toBe('')
  })

  it('pattern 校验', async () => {
    const rules = [{ pattern: /^\d+$/, message: '须为数字' }]
    expect(await validateField('abc', rules, { model: {} })).toBe('须为数字')
    expect(await validateField('123', rules, { model: {} })).toBe('')
  })

  it('validator（返回字符串为错误）', async () => {
    const rules = [
      { validator: (v: unknown) => (v === 'ok' ? true : '不是 ok') },
    ]
    expect(await validateField('bad', rules, { model: {} })).toBe('不是 ok')
    expect(await validateField('ok', rules, { model: {} })).toBe('')
  })
})

describe('collectFields / validateFields', () => {
  const schema: DsNode[] = [
    { component: 'input', field: 'a', rules: [{ required: true, message: 'a 必填' }] },
    {
      component: 'panel',
      children: [
        { component: 'input', field: 'b', rules: [{ required: true, message: 'b 必填' }] },
        { component: 'input', field: 'c' }, // 无规则，不应收集
      ],
    },
  ]

  it('递归收集带 field 的节点', () => {
    expect(collectFields(schema).map((n) => n.field)).toEqual(['a', 'b', 'c'])
  })

  it('整体校验返回错误表', async () => {
    const { valid, errors } = await validateFields(schema, { a: '填了', b: '' })
    expect(valid).toBe(false)
    expect(errors['b']).toBe('b 必填')
    expect(errors['a']).toBeUndefined()
  })
})
