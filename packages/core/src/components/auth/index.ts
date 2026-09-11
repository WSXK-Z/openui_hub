import { withInstall } from '../../utils'
import _DpAuth from './DpAuth.vue'

export const DpAuth = withInstall(_DpAuth)
export default DpAuth
export type { DpAuthComp, DpAuthProps } from './DpAuth.vue'
export * from './store'
export * from './context'
export * from './useAuth'
