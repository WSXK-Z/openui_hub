import { withInstall } from '../utils'
import _DpThemeProvider from './DpThemeProvider.vue'
import _DpThemeSwitch from './DpThemeSwitch.vue'
import _DpThemeToggle from './DpThemeToggle.vue'

export const DpThemeProvider = withInstall(_DpThemeProvider)
export type { DpThemeProviderComp, DpThemeProviderProps } from './DpThemeProvider.vue'

export const DpThemeSwitch = withInstall(_DpThemeSwitch)
export type { DpThemeSwitchComp, DpThemeSwitchProps } from './DpThemeSwitch.vue'

export const DpThemeToggle = withInstall(_DpThemeToggle)
export type { DpThemeToggleComp, DpThemeToggleProps } from './DpThemeToggle.vue'

export * from './themeContext'
export * from './themeMode'
export * from './themeOverrides'
export * from './themeConfig'
export * from './useThemeHost'
