<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcLayoutAside', inheritAttrs: false })

export interface DpcLayoutAsideComp {
  /** 侧栏宽度（px 或 CSS 长度） */
  width: number | string
  /** 是否带右侧边框 */
  bordered: boolean
}

export type DpcLayoutAsideProps = DpcProps<DpcLayoutAsideComp>

const props = defineProps<DpcLayoutAsideProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcLayoutAsideComp>(props, {
  compDefaults: { width: 240, bordered: true },
})

const asideStyle = computed(() => ({
  width: typeof c.value.width === 'number' ? `${c.value.width}px` : c.value.width,
}))
</script>

<template>
  <!-- 侧栏（横向容器中使用）：宽度固定、占满高度。 -->
  <aside v-bind="rootAttrs" class="dpc-layout-aside flex h-full min-h-0 flex-none flex-col overflow-hidden" :class="{
    'border-r border-[var(--dpc-color-border)]': c.bordered,
  }" :style="asideStyle">
    <slot />
  </aside>
</template>
