<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcHeader', inheritAttrs: false })

export interface DpcHeaderComp {
  /** 标题文本（也可用 #title 插槽覆盖） */
  title: string
  /** 品牌 logo 图片地址（也可用 #logo 插槽覆盖） */
  logo: string
  /** 高度（px） */
  height: number
  /** 是否吸顶（用于放在滚动区内时） */
  sticky: boolean
  /** 是否带底部边框 */
  bordered: boolean
}

export type DpcHeaderProps = DpcProps<DpcHeaderComp>

const props = defineProps<DpcHeaderProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcHeaderComp>(props, {
  compDefaults: { title: '', logo: '', height: 48, sticky: false, bordered: true },
})

const headerStyle = computed(() => ({
  height: `${c.value.height}px`,
}))
</script>

<template>
  <header v-bind="rootAttrs" class="dpc-header flex w-full flex-none items-center gap-2 px-4" :class="{
    'sticky top-0 z-20': c.sticky,
    'border-b border-[var(--dpc-color-border)]': c.bordered,
    'bg-[var(--dpc-color-surface)]': c.sticky,
  }" :style="headerStyle">
    <slot name="logo">
      <img v-if="c.logo" class="dpc-header__logo h-6 w-auto shrink-0 object-contain" :src="c.logo" alt="" />
    </slot>

    <slot name="title">
      <h1 class="dpc-header__title min-w-0 truncate text-[15px] font-semibold text-[var(--dpc-color-text)]">
        {{ c.title }}
      </h1>
    </slot>

    <span class="dpc-header__spacer flex-1" aria-hidden="true" />

    <slot name="actions" />
  </header>
</template>
