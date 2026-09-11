import { withInstall } from '@dp_ui/core'
import _DpcConfigProvider from './DpcConfigProvider.vue'

export const DpcConfigProvider = withInstall(_DpcConfigProvider)
export default DpcConfigProvider
export type { DpcConfigProviderComp, DpcConfigProviderProps } from './DpcConfigProvider.vue'
export {
  dpcThemeContextKey,
  provideDpcTheme,
  useDpcTheme,
  type DpcThemeContext,
  type DpcThemeName,
} from './themeContext'
