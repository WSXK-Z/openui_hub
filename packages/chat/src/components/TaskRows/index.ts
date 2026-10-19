import { withInstall } from '@dp_ui/core'
import _DpcTaskRows from './DpcTaskRows.vue'

export const DpcTaskRows = withInstall(_DpcTaskRows)

export default { DpcTaskRows }
export type {
  DpcTaskDetail,
  DpcTaskRow,
  DpcTaskRowsComp,
  DpcTaskRowsLabels,
  DpcTaskRowsProps,
  DpcTaskStatus,
} from './DpcTaskRows.vue'
