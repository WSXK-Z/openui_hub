import { withInstall } from '@dp_ui/core'
import _DpcList from './DpcList.vue'

export const DpcList = withInstall(_DpcList)
export default DpcList
export type {
  DpcListComp,
  DpcListDirection,
  DpcListItem,
  DpcListProps,
  DpcListVariant,
} from './DpcList.vue'
