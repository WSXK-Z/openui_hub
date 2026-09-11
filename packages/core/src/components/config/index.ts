import { withInstall } from '../../utils'
import _DpConfigProvider from './DpConfigProvider.vue'

export const DpConfigProvider = withInstall(_DpConfigProvider)
export default DpConfigProvider
export type { DpConfigProviderComp, DpConfigProviderProps } from './DpConfigProvider.vue'
export * from './themeContext'
