/**
 * @dp_ui/chat 设计令牌（Design Tokens）
 *
 * 说明：
 * - 与 @dp_ui/core 家族同源配色，但使用独立命名空间 `--dpc-*`，避免两个库同时被消费时 CSS 变量冲突。
 * - 同时作为 UnoCSS preset（presetDpChat）的 theme（键位与 preset-mini 兼容）。
 * - 组件样式层通过 `--dpc-*` CSS 变量输出，便于外部用 CSS 或 props 覆盖。
 */

export const dpcColors = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  info: '#06b6d4',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textInverse: '#ffffff',
  border: '#e5e7eb',
  borderHover: '#d1d5db',
  // 激活/选中底
  activeSoft: '#eff6ff',
  // 气泡
  bubbleUser: '#3b82f6',
  bubbleAssistant: '#f3f4f6',
  // 半透明遮罩 / 悬浮底
  scrim: 'rgb(15 23 42 / 0.5)',
  hoverSoft: 'rgb(0 0 0 / 0.04)',
} as const

export const dpcSpacing = {
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

export const dpcRadius = {
  none: '0px',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const

export const dpcBoxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  pop: '0 12px 24px -4px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
} as const

export const dpcFontSize = {
  xs: '12px',
  sm: '13px',
  base: '14px',
  lg: '16px',
  xl: '20px',
} as const

/** UnoCSS preset 兼容的 theme 结构 */
export const dpcTheme = {
  colors: dpcColors,
  spacing: dpcSpacing,
  borderRadius: dpcRadius,
  boxShadow: dpcBoxShadow,
  fontSize: dpcFontSize,
} as const

export type DpcTheme = typeof dpcTheme
export type { DpcTheme as DpcThemeTokens }

/** 导出为 `--dpc-*` 的 CSS 变量键值对 */
export const dpcCssVars: Record<string, string> = {
  '--dpc-color-primary': dpcColors.primary,
  '--dpc-color-primary-hover': dpcColors.primaryHover,
  '--dpc-color-success': dpcColors.success,
  '--dpc-color-warning': dpcColors.warning,
  '--dpc-color-danger': dpcColors.danger,
  '--dpc-color-danger-hover': dpcColors.dangerHover,
  '--dpc-color-info': dpcColors.info,
  '--dpc-color-surface': dpcColors.surface,
  '--dpc-color-surface-muted': dpcColors.surfaceMuted,
  '--dpc-color-text': dpcColors.text,
  '--dpc-color-text-secondary': dpcColors.textSecondary,
  '--dpc-color-text-inverse': dpcColors.textInverse,
  '--dpc-color-border': dpcColors.border,
  '--dpc-color-border-hover': dpcColors.borderHover,
  '--dpc-color-active-soft': dpcColors.activeSoft,
  '--dpc-color-bubble-user': dpcColors.bubbleUser,
  '--dpc-color-bubble-assistant': dpcColors.bubbleAssistant,
  '--dpc-color-scrim': dpcColors.scrim,
  '--dpc-color-hover-soft': dpcColors.hoverSoft,
  '--dpc-radius': dpcRadius.DEFAULT,
  '--dpc-radius-sm': dpcRadius.sm,
  '--dpc-radius-md': dpcRadius.md,
  '--dpc-radius-lg': dpcRadius.lg,
  '--dpc-radius-xl': dpcRadius.xl,
  '--dpc-size-control-h': '40px',
  '--dpc-size-control-h-sm': '32px',
  '--dpc-size-avatar': '32px',
  '--dpc-size-avatar-lg': '40px',
  '--dpc-size-icon': '16px',
  '--dpc-chat-max-width': '760px',
  '--dpc-z-pop': '1000',
  '--dpc-font-family': "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
}

/** 暗色配色（由 DpcConfigProvider 的 data-dpc-theme="dark" 触发覆盖） */
export const dpcColorsDark = {
  primary: '#60a5fa',
  primaryHover: '#3b82f6',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  dangerHover: '#ef4444',
  info: '#22d3ee',
  surface: '#0f172a',
  surfaceMuted: '#1e293b',
  text: '#e5e7eb',
  textSecondary: '#94a3b8',
  textInverse: '#ffffff',
  border: '#334155',
  borderHover: '#475569',
  // 激活/选中底
  activeSoft: 'rgb(96 165 250 / 0.16)',
  // 气泡
  bubbleUser: '#3b82f6',
  bubbleAssistant: '#1e293b',
  // 半透明遮罩 / 悬浮底
  scrim: 'rgb(0 0 0 / 0.6)',
  hoverSoft: 'rgb(255 255 255 / 0.06)',
} as const

/** 暗色模式输出为 `--dpc-*` 的 CSS 变量键值对（样式层在 [data-dpc-theme='dark'] 下应用） */
export const dpcCssVarsDark: Record<string, string> = {
  '--dpc-color-primary': dpcColorsDark.primary,
  '--dpc-color-primary-hover': dpcColorsDark.primaryHover,
  '--dpc-color-success': dpcColorsDark.success,
  '--dpc-color-warning': dpcColorsDark.warning,
  '--dpc-color-danger': dpcColorsDark.danger,
  '--dpc-color-danger-hover': dpcColorsDark.dangerHover,
  '--dpc-color-info': dpcColorsDark.info,
  '--dpc-color-surface': dpcColorsDark.surface,
  '--dpc-color-surface-muted': dpcColorsDark.surfaceMuted,
  '--dpc-color-text': dpcColorsDark.text,
  '--dpc-color-text-secondary': dpcColorsDark.textSecondary,
  '--dpc-color-text-inverse': dpcColorsDark.textInverse,
  '--dpc-color-border': dpcColorsDark.border,
  '--dpc-color-border-hover': dpcColorsDark.borderHover,
  '--dpc-color-active-soft': dpcColorsDark.activeSoft,
  '--dpc-color-bubble-user': dpcColorsDark.bubbleUser,
  '--dpc-color-bubble-assistant': dpcColorsDark.bubbleAssistant,
  '--dpc-color-scrim': dpcColorsDark.scrim,
  '--dpc-color-hover-soft': dpcColorsDark.hoverSoft,
}
