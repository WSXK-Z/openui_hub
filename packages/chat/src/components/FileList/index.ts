import { withInstall } from '@dp_ui/core'
import _DpcFileList from './DpcFileList.vue'

export const DpcFileList = withInstall(_DpcFileList)
export default DpcFileList
export type {
  DpcFileListComp,
  DpcFileListItem,
  DpcFileListProps,
  DpcFileStatus,
} from './DpcFileList.vue'
