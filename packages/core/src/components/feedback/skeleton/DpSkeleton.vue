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
    /** 是否展示扫光动画，默认 true */
    animated: boolean
}

export type DpSkeletonProps = DpProps<DpSkeletonComp>

const props = defineProps<DpSkeletonProps>()

const { comp: c, rootAttrs } = useDpProps<DpSkeletonComp>(props, {
    compDefaults: { variant: 'text', width: '100%', height: '', rows: 1, animated: true },
})

const skeletonStyle = computed(() => {
    const width = typeof c.value.width === 'number' ? `${c.value.width}px` : c.value.width
    let height: string | undefined
    if (c.value.height) {
        height = typeof c.value.height === 'number' ? `${c.value.height}px` : c.value.height
    } else if (c.value.variant === 'circle') {
        height = width
    } else {
        height = '12px'
    }
    return { width, height }
})
</script>

<template>
    <span v-for="index in c.rows" :key="index" v-bind="rootAttrs"
        class="dp-skeleton block rounded-[var(--dp-radius-sm)]"
        :class="[
            c.variant === 'circle' && 'rounded-full',
            c.rows > 1 && index < c.rows && 'mb-2',
            !c.animated && 'dp-skeleton--static',
        ]"
        :style="skeletonStyle" />
</template>

<style scoped>
.dp-skeleton--static::after {
    display: none;
}
</style>
