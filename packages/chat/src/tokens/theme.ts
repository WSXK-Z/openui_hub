/**
 * @dp_ui/chat 设计令牌（Design Tokens）
 *
 * 说明：
 * - 采用 beautiful-ui 的视觉体系：oklch 冷调中性色、实色发丝描边、语义分层阴影与紧凑圆角。
 * - 使用独立命名空间 `--dpc-*`，避免与 @dp_ui/core 的 `--dp-*` 冲突。
 * - 同时作为 UnoCSS preset（presetDpChat）的 theme（键位与 preset-mini 兼容）。
 * - 组件样式层通过 `--dpc-*` CSS 变量输出，便于外部用 CSS 或 props 覆盖。
 */

export const dpcColors = {
  // 画布与表面：冷调蓝灰，白卡片 + 实色发丝线
  page: 'oklch(0.985 0.001 286.376)',
  canvas: 'oklch(0.961 0.002 247.84)',
  surface: 'oklch(1 0 0)',
  inset: 'oklch(0.979 0.002 247.839)',
  hover: 'oklch(0.97 0.002 247.839)',
  hover2: 'oklch(0.933 0.003 247.86)',
  field: 'oklch(0.961 0.001 286.375)',
  // 文字层级
  ink: 'oklch(0.247 0.006 258.361)',
  ink2: 'oklch(0.506 0.01 264.477)',
  ink3: 'oklch(0.695 0.009 264.505)',
  // 描边：实色，不使用低透明度
  line: 'oklch(0.946 0.003 264.542)',
  lineStrong: 'oklch(0.912 0.005 258.326)',
  lineSoft: 'oklch(0.966 0.002 264.542)',
  // 主色与语义色
  accent: 'oklch(0.626 0.205 254.947)',
  accentInk: 'oklch(0.556 0.187 255.617)',
  accentTint: 'oklch(0.96 0.019 252.878)',
  primary: 'oklch(0.626 0.205 254.947)',
  primaryHover: 'oklch(0.556 0.187 255.617)',
  success: 'oklch(0.603 0.155 150.883)',
  green: 'oklch(0.603 0.155 150.883)',
  greenTint: 'oklch(0.958 0.017 159.118)',
  warning: 'oklch(0.689 0.179 49.902)',
  orange: 'oklch(0.689 0.179 49.902)',
  orangeTint: 'oklch(0.964 0.021 67.581)',
  danger: 'oklch(0.621 0.192 23.042)',
  red: 'oklch(0.621 0.192 23.042)',
  redTint: 'oklch(0.956 0.017 17.462)',
  dangerHover: 'oklch(0.556 0.19 23.042)',
  info: 'oklch(0.626 0.205 254.947)',
  text: 'oklch(0.247 0.006 258.361)',
  textSecondary: 'oklch(0.506 0.01 264.477)',
  textInverse: 'oklch(0.99 0 0)',
  border: 'oklch(0.946 0.003 264.542)',
  borderHover: 'oklch(0.912 0.005 258.326)',
  surfaceMuted: 'oklch(0.961 0.002 247.84)',
  // 激活/选中底
  activeSoft: 'oklch(0.96 0.019 252.878)',
  // 气泡
  bubbleUser: 'oklch(0.626 0.205 254.947)',
  bubbleAssistant: 'oklch(0.979 0.002 247.839)',
  // 半透明遮罩 / 悬浮底
  scrim: 'oklch(0 0 0 / 0.5)',
  hoverSoft: 'oklch(0 0 0 / 0.04)',
  // 浮层与提示
  tooltipBg: 'oklch(0.272 0.008 264.435)',
  tooltipFg: 'oklch(0.976 0.002 247.839)',
  tooltipMuted: 'oklch(0.731 0.008 260.731)',
  tooltipBorder: 'oklch(0.356 0.007 264.474)',
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
  chip: '6px',
  control: '8px',
  md: '8px',
  card: '10px',
  lg: '12px',
  window: '14px',
  xl: '16px',
  full: '9999px',
} as const

export const dpcBoxShadow = {
  sm: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1)',
  md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
  pop: '0 12px 24px -4px oklch(0 0 0 / 0.12), 0 4px 8px -4px oklch(0 0 0 / 0.08)',
  // 语义阴影：1px 实色描边 + shadow-plugin 风格的平滑层叠（暗色在 CSS 变量里覆盖）
  hairline: 'var(--dpc-shadow-hairline)',
  btn: 'var(--dpc-shadow-btn)',
  card: 'var(--dpc-shadow-card)',
  raised: 'var(--dpc-shadow-raised)',
  overlay: 'var(--dpc-shadow-overlay)',
} as const

export const dpcFontSize = {
  '2xs': '11px',
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

/** camelCase → kebab-case（`hover2` → `hover-2`，`lineStrong` → `line-strong`） */
function toKebab(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .toLowerCase()
}

/** 把一组颜色导出为 `--dpc-color-*` CSS 变量 */
function colorVars(colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`--dpc-color-${toKebab(key)}`, value]),
  )
}

/** 导出为 `--dpc-*` 的 CSS 变量键值对（亮色） */
export const dpcCssVars: Record<string, string> = {
  ...colorVars(dpcColors),
  '--dpc-radius': dpcRadius.DEFAULT,
  '--dpc-radius-sm': dpcRadius.sm,
  '--dpc-radius-chip': dpcRadius.chip,
  '--dpc-radius-control': dpcRadius.control,
  '--dpc-radius-md': dpcRadius.md,
  '--dpc-radius-card': dpcRadius.card,
  '--dpc-radius-lg': dpcRadius.lg,
  '--dpc-radius-window': dpcRadius.window,
  '--dpc-radius-xl': dpcRadius.xl,
  '--dpc-shadow-hairline': '0 0 0 1px var(--dpc-color-line)',
  '--dpc-shadow-btn': '0 0 0 1px var(--dpc-color-line-strong), 0 1px 2px oklch(0 0 0 / 0.05)',
  '--dpc-shadow-card':
    '0 0 0 1px var(--dpc-color-line), 0 1px 2px oklch(0 0 0 / 0.04), 0 2px 6px oklch(0 0 0 / 0.03)',
  '--dpc-shadow-raised': '0 0 0 1px var(--dpc-color-line), 0 2px 8px oklch(0 0 0 / 0.06)',
  '--dpc-shadow-overlay': '0 0 0 1px var(--dpc-color-line), 0 8px 28px oklch(0 0 0 / 0.12)',
  '--dpc-size-control-h': '40px',
  '--dpc-size-control-h-sm': '32px',
  '--dpc-size-avatar': '32px',
  '--dpc-size-avatar-lg': '40px',
  '--dpc-size-icon': '16px',
  '--dpc-chat-max-width': '760px',
  '--dpc-z-pop': '1000',
  '--dpc-font-family': "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  '--dpc-font-mono': "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
  '--dpc-ease-out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
  '--dpc-ease-in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
}

/** 暗色配色（由 DpcConfigProvider 的 data-dpc-theme="dark" 触发覆盖） */
export const dpcColorsDark = {
  page: 'oklch(0.209 0.004 264.477)',
  canvas: 'oklch(0.231 0.004 264.487)',
  surface: 'oklch(0.26 0.006 271.191)',
  inset: 'oklch(0.243 0.004 264.492)',
  hover: 'oklch(0.289 0.006 271.22)',
  hover2: 'oklch(0.318 0.007 274.747)',
  field: 'oklch(0.293 0.006 271.223)',
  ink: 'oklch(0.964 0.002 247.839)',
  ink2: 'oklch(0.731 0.008 260.731)',
  ink3: 'oklch(0.541 0.01 264.484)',
  line: 'oklch(0.308 0.006 258.354)',
  lineStrong: 'oklch(0.356 0.007 264.474)',
  lineSoft: 'oklch(0.278 0.006 258.354)',
  accent: 'oklch(0.68 0.173 253.301)',
  accentInk: 'oklch(0.788 0.113 248.33)',
  accentTint: 'oklch(0.68 0.173 253.301 / 0.16)',
  primary: 'oklch(0.68 0.173 253.301)',
  primaryHover: 'oklch(0.626 0.205 254.947)',
  success: 'oklch(0.705 0.154 153.814)',
  green: 'oklch(0.705 0.154 153.814)',
  greenTint: 'oklch(0.705 0.154 153.814 / 0.14)',
  warning: 'oklch(0.746 0.156 55.642)',
  orange: 'oklch(0.746 0.156 55.642)',
  orangeTint: 'oklch(0.746 0.156 55.642 / 0.14)',
  danger: 'oklch(0.666 0.18 21.433)',
  red: 'oklch(0.666 0.18 21.433)',
  redTint: 'oklch(0.666 0.18 21.433 / 0.14)',
  dangerHover: 'oklch(0.621 0.192 23.042)',
  info: 'oklch(0.68 0.173 253.301)',
  text: 'oklch(0.964 0.002 247.839)',
  textSecondary: 'oklch(0.731 0.008 260.731)',
  textInverse: 'oklch(0.99 0 0)',
  border: 'oklch(0.308 0.006 258.354)',
  borderHover: 'oklch(0.356 0.007 264.474)',
  surfaceMuted: 'oklch(0.231 0.004 264.487)',
  activeSoft: 'oklch(0.68 0.173 253.301 / 0.16)',
  bubbleUser: 'oklch(0.626 0.205 254.947)',
  bubbleAssistant: 'oklch(0.243 0.004 264.492)',
  scrim: 'oklch(0 0 0 / 0.6)',
  hoverSoft: 'oklch(1 0 0 / 0.06)',
  tooltipBg: 'oklch(0.182 0.004 264.459)',
  tooltipFg: 'oklch(0.964 0.002 247.839)',
  tooltipMuted: 'oklch(0.731 0.008 260.731)',
  tooltipBorder: 'oklch(0.308 0.006 258.354)',
} as const

/** 暗色模式输出为 `--dpc-*` 的 CSS 变量键值对（样式层在 [data-dpc-theme='dark'] 下应用） */
export const dpcCssVarsDark: Record<string, string> = {
  ...colorVars(dpcColorsDark),
  // 暗色下描边改为低透明度亮线，与平滑阴影融为一条连续边缘
  '--dpc-shadow-btn': '0 0 0 1px oklch(1 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.3)',
  '--dpc-shadow-card':
    '0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2)',
  '--dpc-shadow-raised': '0 0 0 1px oklch(1 0 0 / 0.13), 0 2px 10px oklch(0 0 0 / 0.22)',
  '--dpc-shadow-overlay': '0 0 0 1px oklch(1 0 0 / 0.15), 0 8px 28px oklch(0 0 0 / 0.34)',
  '--dpc-shadow-hairline': '0 0 0 1px oklch(1 0 0 / 0.08)',
}
