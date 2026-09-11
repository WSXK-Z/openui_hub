<script setup lang="ts">
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcLayoutHeader', inheritAttrs: false })

export interface DpcLayoutHeaderComp {
  /** 是否带底部边框 */
  bordered: boolean
}

export type DpcLayoutHeaderProps = DpcProps<DpcLayoutHeaderComp>

const props = defineProps<DpcLayoutHeaderProps>()

const {
  comp: c,
  style: s,
  rootAttrs,
} = useDpcProps<DpcLayoutHeaderComp>(props, {
  compDefaults: { bordered: true },
})
</script>

<template>
  <!-- 顶部区域（Layout 第一行）。内容通常放 DpcHeader 或自定义顶栏。 -->
  <header v-bind="rootAttrs" class="dpc-layout-header flex min-h-0 w-full items-center" :class="{
    'border-b border-[var(--dpc-color-border)]': c.bordered,
    'flex-none': !s.block,
  }">
    <slot />
  </header>
</template>
