import { inject, provide, type InjectionKey } from 'vue'

export interface ThemeContext {
  themeOverrides?: Record<string, string | number>
}

export const themeContextKey: InjectionKey<ThemeContext> = Symbol('dp-theme')

export function provideThemeContext(context: ThemeContext) {
  provide(themeContextKey, context)
}

export function useTheme(): ThemeContext {
  return inject(themeContextKey, {}) ?? {}
}
