import { withInstall } from '../../utils'
import _DpLayoutBasic from './DpLayoutBasic.vue'
import _DpLayoutSider from './DpLayoutSider.vue'

export const DpLayoutBasic = withInstall(_DpLayoutBasic)
export const DpLayoutSider = withInstall(_DpLayoutSider)

export default { DpLayoutBasic, DpLayoutSider }
