import { withInstall } from '@dp_ui/core'
import _DpcToolbar from './DpcToolbar.vue'

export const DpcToolbar = withInstall(_DpcToolbar)
export default DpcToolbar
export type { DpcToolbarActionKey, DpcToolbarComp, DpcToolbarProps } from './DpcToolbar.vue'

// 内置操作图标（参照 MateChat 的 McCopyIcon 等，供自定义工具栏复用）
export {
  DpcCheckIcon,
  DpcCopyIcon,
  DpcDeleteIcon,
  DpcDislikeIcon,
  DpcLikeIcon,
  DpcRefreshIcon,
} from '../../internal/icons'
