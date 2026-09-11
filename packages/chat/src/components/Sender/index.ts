import { withInstall } from '@dp_ui/core'
import _DpcSender from './DpcSender.vue'

export const DpcSender = withInstall(_DpcSender)
export default DpcSender
export type {
  DpcSenderAutosize,
  DpcSenderComp,
  DpcSenderProps,
  DpcSubmitShortKey,
} from './DpcSender.vue'
