/**
 * 样式元数据 → 组件 props 的映射工具。
 * 适配 @dp_ui/core 的 `{ theme: DpThemeProps }` 契约与原生组件两种形态。
 */
import type { DsStyle } from '../types/schema'

/**
 * 归一化样式元数据：
 * - 取出布局键（span/full 供容器使用）
 * - 其余键映射为组件可消费的结构
 */
export interface NormalizedStyle {
  /** 提供给 @dp_ui/core 组件 theme prop 的对象（已过滤布局键） */
  themeProps: Record<string, unknown>
  /** 布局键 */
  span: number | undefined
  full: boolean | undefined
}

export function normalizeStyle(style: DsStyle | undefined): NormalizedStyle {
  if (!style) return { themeProps: {}, span: undefined, full: undefined }
  const { span, full, ...rest } = style
  return {
    themeProps: { ...rest },
    span,
    full,
  }
}

/** CSS 变量覆盖：key 缺少 `--` 前缀时自动补齐 */
export function toCssVars(
  cssVars: Record<string, string | number> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {}
  if (!cssVars) return result
  for (const [key, value] of Object.entries(cssVars)) {
    result[key.startsWith('--') ? key : `--${key}`] = String(value)
  }
  return result
}
