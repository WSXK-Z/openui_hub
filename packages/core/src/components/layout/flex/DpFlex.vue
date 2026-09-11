<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpFlex', inheritAttrs: false })

export interface DpFlexComp {
    direction: 'row' | 'row-reverse' | 'column' | 'column-reverse'
    align: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
    justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
    wrap: boolean
    gap: number | string
}

export type DpFlexProps = DpProps<DpFlexComp>

const props = defineProps<DpFlexProps>()

const { comp: c, rootAttrs } = useDpProps<DpFlexComp>(props, {
    compDefaults: { direction: 'row', align: 'stretch', justify: 'start', wrap: false, gap: 0 },
})

const gapVal = computed(() => (typeof c.value.gap === 'number' ? `${c.value.gap}px` : c.value.gap))

const DIRECTION: Record<string, string> = {
    row: 'flex-row',
    'row-reverse': 'flex-row-reverse',
    column: 'flex-col',
    'column-reverse': 'flex-col-reverse',
}
const ALIGN: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
}
const JUSTIFY: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
}
</script>

<template>
    <div v-bind="rootAttrs" class="dp-flex flex" :class="[
        DIRECTION[c.direction],
        ALIGN[c.align],
        JUSTIFY[c.justify],
        c.wrap && 'flex-wrap',
    ]" :style="{ gap: gapVal }">
        <slot />
    </div>
</template>
