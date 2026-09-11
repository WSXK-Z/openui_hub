import { inject, provide, type InjectionKey } from 'vue'

/** @dp_ui/chat 主题名 */
export type DpcThemeName = 'light' | 'dark'

export interface DpcThemeContext {
  theme: DpcThemeName
  /** 主题令牌覆盖（key 省略 --dpc- 前缀） */
  overrides: Record<string, string | number>
}

export const dpcThemeContextKey: InjectionKey<DpcThemeContext> = Symbol('dpc-theme')

export function provideDpcTheme(context: DpcThemeContext) {
  provide(dpcThemeContextKey, context)
}

const DEFAULT_CONTEXT: DpcThemeContext = { theme: 'light', overrides: {} }

/** 读取当前主题上下文（未包裹 DpcConfigProvider 时回退 light） */
export function useDpcTheme(): DpcThemeContext {
  return inject(dpcThemeContextKey, DEFAULT_CONTEXT) ?? DEFAULT_CONTEXT
}
