<script setup lang="ts">
import {
    TooltipContent,
    TooltipPortal,
    TooltipProvider,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui'
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpTooltip', inheritAttrs: false })

export interface DpTooltipComp {
    content: string
    side: 'top' | 'right' | 'bottom' | 'left'
    delayDuration: number
    /** 禁用提示，直接渲染触发元素 */
    disabled: boolean
}

export type DpTooltipProps = DpProps<DpTooltipComp>

const props = defineProps<DpTooltipProps>()

const { comp: c, rootAttrs } = useDpProps<DpTooltipComp>(props, {
    compDefaults: { content: '', side: 'top', delayDuration: 0, disabled: false },
})
</script>

<template>
    <TooltipProvider v-if="!c.disabled" :delay-duration="c.delayDuration">
        <TooltipRoot>
            <TooltipTrigger as-child>
                <slot />
            </TooltipTrigger>
            <TooltipPortal>
                <TooltipContent
                    v-bind="rootAttrs"
                    class="dp-tooltip z-[1000] rounded-[var(--dp-radius-sm)] bg-[var(--dp-color-fg)] px-2.5 py-1.5 text-xs leading-[1.5] text-[var(--dp-color-bg)] shadow-[var(--dp-shadow-3)]"
                    :side="c.side" :side-offset="6">
                    <slot name="content">{{ c.content }}</slot>
                </TooltipContent>
            </TooltipPortal>
        </TooltipRoot>
    </TooltipProvider>
    <slot v-else />
</template>
