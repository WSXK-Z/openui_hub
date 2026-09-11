import { withInstall } from '../utils'
import _DpPanel from './DpPanel.vue'

export const DpPanel = withInstall(_DpPanel)
export default DpPanel
export type { DpPanelComp, DpPanelProps } from './DpPanel.vue'
export * from './panelContext'
