import { withInstall } from '@dp_ui/core'
import _DpcToolChips from './DpcToolChips.vue'

export const DpcToolChips = withInstall(_DpcToolChips)

export default { DpcToolChips }
export type {
  DpcToolChipsComp,
  DpcToolChipsLabels,
  DpcToolChipsProps,
  DpcToolDetailLine,
  DpcToolDiff,
  DpcToolDiffLine,
  DpcToolStep,
} from './DpcToolChips.vue'
