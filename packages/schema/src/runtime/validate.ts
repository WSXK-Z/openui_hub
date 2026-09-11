import type { DsEvalCtx, DsNode, DsRule } from '../types'
import { getPath } from './path'

/** 校验单个字段，返回错误文案；通过返回空串 */
export async function validateField(
  value: unknown,
  rules: DsRule[] | undefined,
  ctx: DsEvalCtx,
): Promise<string> {
  if (!rules || rules.length === 0) return ''
  const isEmpty = value === undefined || value === null || value === ''
  for (const rule of rules) {
    if (rule.required && isEmpty) {
      return rule.message ?? '该字段为必填项'
    }
    if (!isEmpty && rule.pattern) {
      const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern
      if (!pattern.test(String(value))) return rule.message ?? '格式不正确'
    }
    if (rule.validator) {
      const result = await rule.validator(value, ctx)
      if (result !== true) return typeof result === 'string' ? result : (rule.message ?? '校验未通过')
    }
  }
  return ''
}

/** 深度遍历 schema，收集所有带 field 且带校验规则的节点 */
export function collectFields(nodes: DsNode[]): DsNode[] {
  const result: DsNode[] = []
  const walk = (list: DsNode[]) => {
    for (const node of list) {
      if (node.field) result.push(node)
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return result
}

/** 校验一组字段节点；返回 { valid, errors: Record<fieldPath, message> } */
export async function validateFields(
  nodes: DsNode[],
  model: Record<string, unknown>,
): Promise<{ valid: boolean; errors: Record<string, string> }> {
  const errors: Record<string, string> = {}
  for (const node of collectFields(nodes)) {
    const value = node.field ? getPath(model, node.field) : undefined
    const message = await validateField(value, node.rules, { model })
    if (message && node.field) errors[node.field] = message
  }
  return { valid: Object.keys(errors).length === 0, errors }
}
