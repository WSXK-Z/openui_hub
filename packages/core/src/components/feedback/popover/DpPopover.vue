<script setup lang="ts">
import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,
} from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpPopover', inheritAttrs: false })

export type DpPopoverSide = 'top' | 'right' | 'bottom' | 'left'
export type DpPopoverAlign = 'start' | 'center' | 'end'

export interface DpPopoverComp {
    side: DpPopoverSide
    align: DpPopoverAlign
    sideOffset: number
}

export type DpPopoverProps = DpProps<DpPopoverComp>

const props = defineProps<DpPopoverProps>()

const { comp: c, rootAttrs } = useDpProps<DpPopoverComp>(props, {
    compDefaults: { side: 'bottom', align: 'start', sideOffset: 6 },
})

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
    <!-- 通用浮层（封装 reka-ui Popover）：默认插槽 = 触发元素；#content 插槽 = 浮层内容 -->
    <PopoverRoot v-model:open="open">
        <PopoverTrigger as-child>
            <slot />
        </PopoverTrigger>
        <PopoverPortal>
            <PopoverContent v-bind="rootAttrs"
                class="dp-popover z-[1000] rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] shadow-[0_12px_24px_-4px_rgb(0_0_0_/_0.12),0_4px_8px_-4px_rgb(0_0_0_/_0.08)]"
                :side="c.side" :align="c.align" :side-offset="c.sideOffset">
                <slot name="content" />
            </PopoverContent>
        </PopoverPortal>
    </PopoverRoot>
</template>
