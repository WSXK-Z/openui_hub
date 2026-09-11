<script setup lang="ts">
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcLayoutSender', inheritAttrs: false })

export interface DpcLayoutSenderComp {
  /** 是否带顶部边框 */
  bordered: boolean
}

export type DpcLayoutSenderProps = DpcProps<DpcLayoutSenderComp>

const props = defineProps<DpcLayoutSenderProps>()

const {
  comp: c,
  style: s,
  rootAttrs,
} = useDpcProps<DpcLayoutSenderComp>(props, {
  compDefaults: { bordered: true },
})
</script>

<template>
  <!-- 底部发送区（Layout 第三行）。内容通常放 DpcSender。 -->
  <footer v-bind="rootAttrs" class="dpc-layout-sender flex min-h-0 w-full" :class="{
    'border-t border-[var(--dpc-color-border)]': c.bordered,
    'flex-none': !s.block,
  }">
    <slot />
  </footer>
</template>
