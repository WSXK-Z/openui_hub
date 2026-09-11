import { withInstall } from '@dp_ui/core'
import _DpcLayout from './DpcLayout.vue'
import _DpcLayoutAside from './DpcLayoutAside.vue'
import _DpcLayoutContent from './DpcLayoutContent.vue'
import _DpcLayoutHeader from './DpcLayoutHeader.vue'
import _DpcLayoutSender from './DpcLayoutSender.vue'

export const DpcLayout = withInstall(_DpcLayout)
export const DpcLayoutAside = withInstall(_DpcLayoutAside)
export const DpcLayoutContent = withInstall(_DpcLayoutContent)
export const DpcLayoutHeader = withInstall(_DpcLayoutHeader)
export const DpcLayoutSender = withInstall(_DpcLayoutSender)

export default { DpcLayout, DpcLayoutAside, DpcLayoutContent, DpcLayoutHeader, DpcLayoutSender }
export type { DpcLayoutComp, DpcLayoutProps } from './DpcLayout.vue'
export type { DpcLayoutAsideComp, DpcLayoutAsideProps } from './DpcLayoutAside.vue'
export type { DpcLayoutContentComp, DpcLayoutContentProps } from './DpcLayoutContent.vue'
export type { DpcLayoutHeaderComp, DpcLayoutHeaderProps } from './DpcLayoutHeader.vue'
export type { DpcLayoutSenderComp, DpcLayoutSenderProps } from './DpcLayoutSender.vue'
