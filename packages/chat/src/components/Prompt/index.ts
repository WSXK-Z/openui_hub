import { withInstall } from '@dp_ui/core'
import _DpcPrompt from './DpcPrompt.vue'

export const DpcPrompt = withInstall(_DpcPrompt)
export default DpcPrompt
export type {
  DpcPromptComp,
  DpcPromptDirection,
  DpcPromptItem,
  DpcPromptProps,
} from './DpcPrompt.vue'
