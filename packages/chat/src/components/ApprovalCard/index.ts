import { withInstall } from '@dp_ui/core'
import _DpcApprovalCard from './DpcApprovalCard.vue'

export const DpcApprovalCard = withInstall(_DpcApprovalCard)

export default { DpcApprovalCard }
export type {
  DpcApprovalCardComp,
  DpcApprovalCardProps,
  DpcApprovalLabels,
  DpcApprovalQuestion,
} from './DpcApprovalCard.vue'
