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
}

export type DpTooltipProps = DpProps<DpTooltipComp>

const props = defineProps<DpTooltipProps>()

const { comp: c, rootAttrs } = useDpProps<DpTooltipComp>(props, {
    compDefaults: { content: '', side: 'top', delayDuration: 0 },
})
</script>

<template>
    <TooltipProvider :delay-duration="c.delayDuration">
        <TooltipRoot>
            <TooltipTrigger as-child>
                <slot />
            </TooltipTrigger>
            <TooltipPortal>
                <TooltipContent
                    v-bind="rootAttrs"
                    class="dp-tooltip z-[1000] rounded-[var(--dp-radius-sm)] bg-[var(--dp-color-text)] px-2.5 py-1.5 text-[13px] leading-[1.4] text-[var(--dp-color-surface)] shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.1)]"
                    :side="c.side" :side-offset="6">
                    <slot name="content">{{ c.content }}</slot>
                </TooltipContent>
            </TooltipPortal>
        </TooltipRoot>
    </TooltipProvider>
</template>
