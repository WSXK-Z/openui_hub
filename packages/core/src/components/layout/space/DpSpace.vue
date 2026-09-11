<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpSpace', inheritAttrs: false })

export type DpSpaceSize = 'small' | 'medium' | 'large' | number | string

export interface DpSpaceComp {
    direction: 'horizontal' | 'vertical'
    size: DpSpaceSize | [DpSpaceSize, DpSpaceSize]
    wrap: boolean
    align: 'start' | 'center' | 'end' | 'baseline'
    justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
}

export type DpSpaceProps = DpProps<DpSpaceComp>

const SIZE_MAP: Record<string, string> = {
    small: '8px',
    medium: '16px',
    large: '24px',
}

const props = defineProps<DpSpaceProps>()

const { comp: c, rootAttrs } = useDpProps<DpSpaceComp>(props, {
    compDefaults: { direction: 'horizontal', size: 'medium', wrap: false, align: 'start', justify: 'start' },
})

function resolveSize(size: DpSpaceSize): string {
    return typeof size === 'number' ? `${size}px` : (SIZE_MAP[size] ?? size)
}

const gapArr = computed<[DpSpaceSize, DpSpaceSize]>(() =>
    Array.isArray(c.value.size) ? c.value.size : [c.value.size, c.value.size],
)

// gap 由 comp 动态计算，无法用原子类静态表达，故用内联 style（其余全部为 UnoCSS 原子类）
const gap = computed(() => `${resolveSize(gapArr.value[0])} ${resolveSize(gapArr.value[1])}`)

const DIRECTION_CLASSES: Record<'horizontal' | 'vertical', string> = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
}

const ALIGN_CLASSES: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
}

const JUSTIFY_CLASSES: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
}

const classes = computed(() => [
    'dp-space',
    'inline-flex',
    `dp-space--${c.value.direction}`,
    `dp-space--align-${c.value.align}`,
    `dp-space--justify-${c.value.justify}`,
    DIRECTION_CLASSES[c.value.direction],
    ALIGN_CLASSES[c.value.align],
    JUSTIFY_CLASSES[c.value.justify],
    c.value.wrap && 'dp-space--wrap flex-wrap',
])
</script>

<template>
    <div v-bind="rootAttrs" :class="classes" :style="{ gap }">
        <slot />
    </div>
</template>
