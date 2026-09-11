import { withInstall } from '@dp_ui/core'
import _DpcBubble from './DpcBubble.vue'
import _DpcBubbleLoading from './DpcBubbleLoading.vue'

export const DpcBubble = withInstall(_DpcBubble)
export const DpcBubbleLoading = withInstall(_DpcBubbleLoading)

export default { DpcBubble, DpcBubbleLoading }
export type {
  DpcBubbleAlign,
  DpcBubbleAvatar,
  DpcBubbleComp,
  DpcBubbleProps,
  DpcBubbleRole,
  DpcBubbleVariant,
} from './DpcBubble.vue'
export type { DpcBubbleLoadingComp, DpcBubbleLoadingProps } from './DpcBubbleLoading.vue'
