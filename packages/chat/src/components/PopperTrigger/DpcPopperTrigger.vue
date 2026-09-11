<script setup lang="ts">
import { DpPopover } from '@dp_ui/core'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcPopperTrigger', inheritAttrs: false })

export type DpcPopperSide = 'top' | 'right' | 'bottom' | 'left'
export type DpcPopperAlign = 'start' | 'center' | 'end'

export interface DpcPopperTriggerComp {
  side: DpcPopperSide
  align: DpcPopperAlign
  sideOffset: number
}

export type DpcPopperTriggerProps = DpcProps<DpcPopperTriggerComp>

const props = defineProps<DpcPopperTriggerProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcPopperTriggerComp>(props, {
  compDefaults: { side: 'bottom', align: 'start', sideOffset: 6 },
})

const open = defineModel<boolean>('open', { default: false })

defineExpose({ open })
</script>

<template>
  <!-- 通用浮层触发器（复用 @dp_ui/core 的 DpPopover，chat 不直接依赖 reka-ui）：
        默认插槽 = 触发元素；#content 插槽 = 弹层内容。 -->
  <DpPopover v-bind="rootAttrs" v-model:open="open" :comp="{ side: c.side, align: c.align, sideOffset: c.sideOffset }">
    <slot />
    <template #content>
      <slot name="content" />
    </template>
  </DpPopover>
</template>
