/** 主题令牌覆盖的 CSS 值。数字会按原样写入 CSS 变量。 */
export type DpThemeCssValue = string | number

/**
 * 颜色值：支持 hex、rgb/hsl、oklch 等 CSS 颜色。
 * @example '#7c3aed'
 * @example 'oklch(50% 0.17 268)'
 * @example 'var(--brand-color)'
 */
export type DpThemeColorValue = 'currentColor' | 'transparent' | 'inherit' | (string & {})

/**
 * 尺寸值：圆角、控件高度、间距等。
 * @example '10px'
 * @example '0.75rem'
 * @example 16
 */
export type DpThemeLengthValue = '0' | 'auto' | 'inherit' | number | (string & {})

/**
 * 阴影值：`--dp-shadow-*` 与 `--dp-ring`。
 * @example '0 4px 14px rgb(0 0 0 / 0.12)'
 */
export type DpThemeShadowValue = 'none' | 'inherit' | (string & {})

/**
 * 动效时长。
 * @example '200ms'
 * @example '0.2s'
 */
export type DpThemeDurationValue =
  | '0s'
  | '80ms'
  | '140ms'
  | '200ms'
  | '320ms'
  | '480ms'
  | (string & {})

/**
 * 缓动曲线。
 * @example 'cubic-bezier(0.2, 0, 0, 1)'
 * @example 'ease-out'
 */
export type DpThemeEasingValue =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'step-start'
  | 'step-end'
  | (string & {})

/**
 * 字体族。
 * @example "'Inter', system-ui, sans-serif"
 */
export type DpThemeFontValue =
  | 'inherit'
  | 'system-ui'
  | 'sans-serif'
  | 'serif'
  | 'monospace'
  | (string & {})

/** 语义颜色令牌（对应 `--dp-color-*`） */
export const dpThemeColorKeys = [
  'color-bg',
  'color-surface',
  'color-surface-2',
  'color-surface-3',
  'color-fg',
  'color-fg-2',
  'color-muted',
  'color-border',
  'color-border-strong',
  'color-accent',
  'color-accent-hover',
  'color-accent-soft',
  'color-accent-fg',
  'color-brass',
  'color-ok',
  'color-warn',
  'color-danger',
  'color-info',
  'color-primary',
  'color-primary-hover',
  'color-success',
  'color-success-hover',
  'color-warning',
  'color-warning-hover',
  'color-danger-hover',
  'color-info-hover',
  'color-text',
  'color-text-secondary',
  'color-border-hover',
] as const

export type DpThemeColorKey = (typeof dpThemeColorKeys)[number]

/** 圆角令牌（对应 `--dp-radius*`） */
export const dpThemeRadiusKeys = [
  'radius',
  'radius-xs',
  'radius-sm',
  'radius-md',
  'radius-lg',
  'radius-xl',
  'radius-full',
] as const

export type DpThemeRadiusKey = (typeof dpThemeRadiusKeys)[number]

/** 阴影与焦点环令牌 */
export const dpThemeShadowKeys = ['shadow-1', 'shadow-2', 'shadow-3', 'ring'] as const

export type DpThemeShadowKey = (typeof dpThemeShadowKeys)[number]

/** 控件尺寸令牌 */
export const dpThemeSizeKeys = [
  'size-btn-h-sm',
  'size-btn-h',
  'size-btn-h-lg',
  'space-btn-x',
] as const

export type DpThemeSizeKey = (typeof dpThemeSizeKeys)[number]

/** 动效时长令牌 */
export const dpThemeDurationKeys = [
  'dur-instant',
  'dur-fast',
  'dur-base',
  'dur-slow',
  'dur-slower',
] as const

export type DpThemeDurationKey = (typeof dpThemeDurationKeys)[number]

/** 缓动令牌 */
export const dpThemeEasingKeys = ['ease-standard', 'ease-enter', 'ease-exit'] as const

export type DpThemeEasingKey = (typeof dpThemeEasingKeys)[number]

/** 字体令牌 */
export const dpThemeFontKeys = ['font-display', 'font-family', 'font-mono'] as const

export type DpThemeFontKey = (typeof dpThemeFontKeys)[number]

/** 全部内置令牌键（省略 `--dp-` 前缀） */
export const dpThemeOverrideKeys = [
  ...dpThemeColorKeys,
  ...dpThemeRadiusKeys,
  ...dpThemeShadowKeys,
  ...dpThemeSizeKeys,
  ...dpThemeDurationKeys,
  ...dpThemeEasingKeys,
  ...dpThemeFontKeys,
] as const

export type DpThemeOverrideKey = (typeof dpThemeOverrideKeys)[number]

/**
 * 主题令牌覆盖表。
 *
 * 键为 `--dp-*` 去掉前缀（如 `color-primary` → `--dp-color-primary`）；
 * 值使用 CSS 值，也可传数字。未列出的自定义键会映射为 `--dp-<key>`。
 *
 * @example
 * {
 *   'color-primary': '#7c3aed',
 *   'color-accent': 'oklch(50% 0.17 268)',
 *   radius: '10px',
 *   'shadow-2': '0 4px 14px rgb(0 0 0 / 0.12)',
 *   'dur-base': '200ms',
 * }
 */
export type DpThemeOverrides = Partial<
  Record<DpThemeColorKey, DpThemeColorValue> &
    Record<DpThemeRadiusKey, DpThemeLengthValue> &
    Record<DpThemeShadowKey, DpThemeShadowValue> &
    Record<DpThemeSizeKey, DpThemeLengthValue> &
    Record<DpThemeDurationKey, DpThemeDurationValue> &
    Record<DpThemeEasingKey, DpThemeEasingValue> &
    Record<DpThemeFontKey, DpThemeFontValue>
> & {
  /** 自定义令牌：键省略 `--dp-` 前缀 */
  [key: string]: DpThemeCssValue | undefined
}
