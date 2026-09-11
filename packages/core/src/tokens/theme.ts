/**
 * @dp_ui/core 设计令牌（Design Tokens）
 *
 * 说明：
 * - 同时作为 UnoCSS preset 的 theme（键位与 preset-mini 兼容：colors / spacing / borderRadius / boxShadow / fontSize 等）。
 * - 组件样式层通过 `--dp-*` CSS 变量输出，便于外部用 CSS 或 props 覆盖（见设计文档 §8.4）。
 */

export const dpColors = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  success: '#22c55e',
  successHover: '#16a34a',
  warning: '#f59e0b',
  warningHover: '#d97706',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  info: '#06b6d4',
  infoHover: '#0891b2',
  surface: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  borderHover: '#d1d5db',
} as const

export const dpSpacing = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
} as const

export const dpRadius = {
  none: '0px',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  full: '9999px',
} as const

export const dpBoxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
} as const

export const dpFontSize = {
  xs: '12px',
  sm: '13px',
  base: '14px',
  lg: '16px',
  xl: '20px',
} as const

/** UnoCSS preset 兼容的 theme 结构 */
export const dpTheme = {
  colors: dpColors,
  spacing: dpSpacing,
  borderRadius: dpRadius,
  boxShadow: dpBoxShadow,
  fontSize: dpFontSize,
} as const

export type DpTheme = typeof dpTheme
export type { DpTheme as DpThemeTokens }

/** 导出为 `--dp-*` 的 CSS 变量键值对 */
export const dpCssVars: Record<string, string> = {
  '--dp-color-primary': dpColors.primary,
  '--dp-color-primary-hover': dpColors.primaryHover,
  '--dp-color-success': dpColors.success,
  '--dp-color-success-hover': dpColors.successHover,
  '--dp-color-warning': dpColors.warning,
  '--dp-color-warning-hover': dpColors.warningHover,
  '--dp-color-danger': dpColors.danger,
  '--dp-color-danger-hover': dpColors.dangerHover,
  '--dp-color-info': dpColors.info,
  '--dp-color-info-hover': dpColors.infoHover,
  '--dp-color-surface': dpColors.surface,
  '--dp-color-text': dpColors.text,
  '--dp-color-text-secondary': dpColors.textSecondary,
  '--dp-color-border': dpColors.border,
  '--dp-color-border-hover': dpColors.borderHover,
  '--dp-radius': dpRadius.DEFAULT,
  '--dp-radius-sm': dpRadius.sm,
  '--dp-radius-md': dpRadius.md,
  '--dp-radius-lg': dpRadius.lg,
  '--dp-size-btn-h-sm': '32px',
  '--dp-size-btn-h': '40px',
  '--dp-size-btn-h-lg': '48px',
  '--dp-space-btn-x': '16px',
  '--dp-font-family': "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
}
