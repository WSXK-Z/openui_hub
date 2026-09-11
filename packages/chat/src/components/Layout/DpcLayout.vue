<script setup lang="ts">
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcLayout', inheritAttrs: false })

export interface DpcLayoutComp {
  /** 行间隙（px 或 CSS 长度） */
  gap: number | string
}

export type DpcLayoutProps = DpcProps<DpcLayoutComp>

const props = defineProps<DpcLayoutProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcLayoutComp>(props, {
  compDefaults: { gap: 0 },
})
</script>

<template>
  <!--
      聊天外壳：三行网格（auto / 1fr / auto）。
      直接子级按顺序落位：首个（可选顶部区 Header / DpcLayoutHeader）→
      中部滚动区（DpcLayoutContent）→ 底部发送区（DpcLayoutSender / DpcSender）。
    -->
  <section v-bind="rootAttrs" class="dpc-layout grid h-full w-full overflow-hidden bg-[var(--dpc-color-surface)]"
    :style="{
      gridTemplateRows: 'auto minmax(0, 1fr) auto',
      ...(c.gap ? { gap: typeof c.gap === 'number' ? `${c.gap}px` : c.gap } : {}),
    }">
    <slot />
  </section>
</template>
