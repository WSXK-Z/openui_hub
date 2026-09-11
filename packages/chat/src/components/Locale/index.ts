import { withInstall } from '@dp_ui/core'
import _DpcLocale from './DpcLocale.vue'

export const DpcLocale = withInstall(_DpcLocale)
export default DpcLocale
export type { DpcLocaleComp, DpcLocaleProps } from './DpcLocale.vue'
export * from './locales'
export {
  dpcLocaleContextKey,
  provideDpcLocale,
  useDpcLocale,
  type DpcLocaleContext,
  type DpcLocaleOptions,
} from './localeContext'
