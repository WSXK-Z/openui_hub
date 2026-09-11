import type { DsCondition, DsEvalCtx } from '../types'

/**
 * 求值条件。
 * - 未提供（undefined）→ 返回 `defaultValue`（visible 默认 true、disabled 默认 false）；
 * - 布尔字面量原样返回；函数按求值结果返回。
 */
export function evalCondition(
  cond: DsCondition | undefined,
  ctx: DsEvalCtx,
  defaultValue = true,
): boolean {
  if (cond === undefined) return defaultValue
  if (typeof cond === 'boolean') return cond
  if (typeof cond === 'function') return cond(ctx) === true
  return defaultValue
}
