import { withInstall } from '@dp_ui/core'
import _DpcPromptBar from './DpcPromptBar.vue'

export const DpcPromptBar = withInstall(_DpcPromptBar)

export default { DpcPromptBar }
export type {
  DpcPromptBarComp,
  DpcPromptBarProps,
  DpcPromptBarVariant,
  DpcPromptModel,
} from './DpcPromptBar.vue'
