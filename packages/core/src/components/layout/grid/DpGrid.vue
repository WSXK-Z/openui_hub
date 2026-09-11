<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpGrid', inheritAttrs: false })

export interface DpGridComp {
    cols: number
    gap: number | string
    align: 'start' | 'center' | 'end' | 'stretch'
    justify: 'start' | 'center' | 'end' | 'stretch'
}

export type DpGridProps = DpProps<DpGridComp>

const props = defineProps<DpGridProps>()

const { comp: c, rootAttrs } = useDpProps<DpGridComp>(props, {
    compDefaults: { cols: 2, gap: 16, align: 'stretch', justify: 'stretch' },
})

const gapVal = computed(() => (typeof c.value.gap === 'number' ? `${c.value.gap}px` : c.value.gap))

const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${c.value.cols}, minmax(0, 1fr))`,
    gap: gapVal.value,
}))
</script>

<template>
    <div v-bind="rootAttrs" class="dp-grid grid" :class="[
        c.align === 'start' && 'items-start',
        c.align === 'center' && 'items-center',
        c.align === 'end' && 'items-end',
        c.justify === 'start' && 'justify-items-start',
        c.justify === 'center' && 'justify-items-center',
        c.justify === 'end' && 'justify-items-end',
    ]" :style="gridStyle">
        <slot />
    </div>
</template>
