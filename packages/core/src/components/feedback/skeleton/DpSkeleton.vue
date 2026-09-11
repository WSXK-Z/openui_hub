<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpSkeleton', inheritAttrs: false })

export interface DpSkeletonComp {
    variant: 'text' | 'rect' | 'circle'
    width: number | string
    height: number | string
    rows: number
}

export type DpSkeletonProps = DpProps<DpSkeletonComp>

const props = defineProps<DpSkeletonProps>()

const { comp: c, rootAttrs } = useDpProps<DpSkeletonComp>(props, {
    compDefaults: { variant: 'text', width: '100%', height: '', rows: 1 },
})

const skeletonStyle = computed(() => {
    const width = typeof c.value.width === 'number' ? `${c.value.width}px` : c.value.width
    let height: string | undefined
    if (c.value.height) {
        height = typeof c.value.height === 'number' ? `${c.value.height}px` : c.value.height
    } else if (c.value.variant === 'circle') {
        height = width
    }
    return {
        width,
        height,
        animation: 'dp-pulse 1.5s ease-in-out infinite',
    }
})
</script>

<template>
    <span v-for="index in c.rows" :key="index" v-bind="rootAttrs"
        class="dp-skeleton block rounded-[var(--dp-radius-sm)] bg-[color-mix(in_srgb,var(--dp-color-border)_60%,transparent)]"
        :class="[c.variant === 'circle' && 'rounded-full', c.rows > 1 && index < c.rows && 'mb-2']"
        :style="skeletonStyle" />
</template>
