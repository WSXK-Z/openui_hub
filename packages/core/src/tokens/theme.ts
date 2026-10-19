/**
 * @dp_ui/core 设计令牌（Design Tokens）
 *
 * 说明：
 * - 同时作为 UnoCSS preset 的 theme（键位与 preset-mini 兼容：colors / spacing / borderRadius / boxShadow / fontSize 等）。
 * - 组件样式层通过 `--dp-*` CSS 变量输出，便于外部用 CSS 或 props 覆盖（见设计文档 §8.4）。
 */

export const dpColors = {
  // 语义层（设计文档 §3.3）：页面 / 表面 / 文字 / 描边 / 主色与状态色
  bg: 'oklch(99.2% 0.002 255)',
  surface: 'oklch(100% 0 0)',
  surface2: 'oklch(97.4% 0.004 255)',
  surface3: 'oklch(95.2% 0.006 255)',
  fg: 'oklch(17% 0.015 265)',
  fg2: 'oklch(40% 0.012 262)',
  muted: 'oklch(56% 0.01 260)',
  border: 'oklch(91% 0.006 260)',
  borderStrong: 'oklch(83% 0.008 260)',
  accent: 'oklch(50% 0.17 268)',
  accentHover: 'oklch(45% 0.18 268)',
  accentSoft: 'oklch(95.5% 0.025 268)',
  accentFg: 'oklch(99% 0.005 268)',
  brass: 'oklch(60% 0.10 70)',
  ok: 'oklch(56% 0.14 155)',
  warn: 'oklch(68% 0.14 75)',
  danger: 'oklch(55% 0.18 25)',
  info: 'oklch(58% 0.12 240)',
  // 兼容别名：既有组件与 themeOverrides 仍按这些名字使用
  primary: 'oklch(50% 0.17 268)',
  primaryHover: 'oklch(45% 0.18 268)',
  success: 'oklch(56% 0.14 155)',
  successHover: 'oklch(52% 0.14 155)',
  warning: 'oklch(68% 0.14 75)',
  warningHover: 'oklch(62% 0.14 75)',
  dangerHover: 'oklch(48% 0.18 25)',
  infoHover: 'oklch(52% 0.12 240)',
  text: 'oklch(17% 0.015 265)',
  textSecondary: 'oklch(40% 0.012 262)',
  borderHover: 'oklch(83% 0.008 260)',
} as const

/** 暗色主题配色（由容器上的 `data-dp-theme="dark"` 触发覆盖） */
export const dpColorsDark = {
  bg: 'oklch(15.5% 0.012 265)',
  surface: 'oklch(18.5% 0.014 265)',
  surface2: 'oklch(22% 0.015 265)',
  surface3: 'oklch(26% 0.016 265)',
  fg: 'oklch(95% 0.005 260)',
  fg2: 'oklch(80% 0.01 260)',
  muted: 'oklch(63% 0.012 260)',
  border: 'oklch(27% 0.014 265)',
  borderStrong: 'oklch(36% 0.016 265)',
  accent: 'oklch(70% 0.14 268)',
  accentHover: 'oklch(76% 0.13 268)',
  accentSoft: 'oklch(24% 0.05 268)',
  accentFg: 'oklch(16% 0.02 268)',
  brass: 'oklch(72% 0.09 70)',
  ok: 'oklch(70% 0.13 155)',
  warn: 'oklch(78% 0.13 75)',
  danger: 'oklch(66% 0.16 25)',
  info: 'oklch(70% 0.11 240)',
  primary: 'oklch(70% 0.14 268)',
  primaryHover: 'oklch(76% 0.13 268)',
  success: 'oklch(70% 0.13 155)',
  successHover: 'oklch(64% 0.13 155)',
  warning: 'oklch(78% 0.13 75)',
  warningHover: 'oklch(72% 0.13 75)',
  dangerHover: 'oklch(60% 0.16 25)',
  infoHover: 'oklch(64% 0.11 240)',
  text: 'oklch(95% 0.005 260)',
  textSecondary: 'oklch(80% 0.01 260)',
  borderHover: 'oklch(36% 0.016 265)',
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
  '20': '80px',
  '24': '96px',
} as const

export const dpRadius = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  DEFAULT: '10px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '999px',
} as const

export const dpBoxShadow = {
  // 语义阴影（设计文档 §6.2），暗色在 CSS 变量中覆盖
  '1': 'var(--dp-shadow-1)',
  '2': 'var(--dp-shadow-2)',
  '3': 'var(--dp-shadow-3)',
  // 兼容 UnoCSS 既有键位
  sm: 'var(--dp-shadow-1)',
  DEFAULT: 'var(--dp-shadow-1)',
  md: 'var(--dp-shadow-2)',
  lg: 'var(--dp-shadow-3)',
} as const

export const dpFontSize = {
  '2xs': '11px',
  xs: '12px',
  sm: '13px',
  base: '15px',
  md: '17px',
  lg: '21px',
  xl: '28px',
  '2xl': '38px',
  '3xl': '52px',
  '4xl': '72px',
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

/** camelCase → kebab-case（`fg2` → `fg-2`，`borderStrong` → `border-strong`） */
function toKebab(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .toLowerCase()
}

/** 把一组颜色导出为 `--dp-color-*` CSS 变量 */
function colorVars(colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`--dp-color-${toKebab(key)}`, value]),
  )
}

/** 导出为 `--dp-*` 的 CSS 变量键值对（亮色） */
export const dpCssVars: Record<string, string> = {
  ...colorVars(dpColors),
  '--dp-radius-xs': dpRadius.xs,
  '--dp-radius-sm': dpRadius.sm,
  '--dp-radius': dpRadius.DEFAULT,
  '--dp-radius-md': dpRadius.md,
  '--dp-radius-lg': dpRadius.lg,
  '--dp-radius-xl': dpRadius.xl,
  '--dp-radius-full': dpRadius.full,
  '--dp-shadow-1':
    '0 1px 2px oklch(20% 0.02 265 / 0.06), 0 1px 1px oklch(20% 0.02 265 / 0.04)',
  '--dp-shadow-2':
    '0 4px 14px -4px oklch(20% 0.02 265 / 0.12), 0 1px 3px oklch(20% 0.02 265 / 0.06)',
  '--dp-shadow-3':
    '0 18px 44px -16px oklch(20% 0.02 265 / 0.22), 0 4px 12px -4px oklch(20% 0.02 265 / 0.08)',
  '--dp-ring': '0 0 0 3px oklch(50% 0.17 268 / 0.22)',
  '--dp-size-btn-h-sm': '30px',
  '--dp-size-btn-h': '38px',
  '--dp-size-btn-h-lg': '46px',
  '--dp-space-btn-x': '16px',
  '--dp-dur-instant': '80ms',
  '--dp-dur-fast': '140ms',
  '--dp-dur-base': '200ms',
  '--dp-dur-slow': '320ms',
  '--dp-dur-slower': '480ms',
  '--dp-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  '--dp-ease-enter': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--dp-ease-exit': 'cubic-bezier(0.4, 0, 1, 1)',
  '--dp-font-display':
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif",
  '--dp-font-family':
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
  '--dp-font-mono': "'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace",
}

/** 暗色模式输出为 `--dp-*` 的 CSS 变量键值对（`[data-dp-theme='dark']` 下应用） */
export const dpCssVarsDark: Record<string, string> = {
  ...colorVars(dpColorsDark),
  '--dp-shadow-1': '0 1px 2px oklch(0% 0 0 / 0.4)',
  '--dp-shadow-2': '0 6px 18px -6px oklch(0% 0 0 / 0.55)',
  '--dp-shadow-3': '0 24px 60px -20px oklch(0% 0 0 / 0.7)',
  '--dp-ring': '0 0 0 3px oklch(70% 0.14 268 / 0.28)',
}
