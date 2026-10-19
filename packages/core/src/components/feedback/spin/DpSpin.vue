<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpSpin', inheritAttrs: false })

export interface DpSpinComp {
    size: number | string
    /** 加载指示器下方的说明文字 */
    description: string
}

export type DpSpinProps = DpProps<DpSpinComp>

const props = defineProps<DpSpinProps>()

const { comp: c, rootAttrs } = useDpProps<DpSpinComp>(props, {
    compDefaults: { size: 24, description: '' },
})

const spinnerStyle = computed(() => ({
    width: typeof c.value.size === 'number' ? `${c.value.size}px` : c.value.size,
    height: typeof c.value.size === 'number' ? `${c.value.size}px` : c.value.size,
    animation: 'dp-spin 0.6s linear infinite',
}))
</script>

<template>
    <span v-bind="rootAttrs" class="dp-spin-wrap inline-flex flex-col items-center gap-2" role="status"
        aria-label="loading">
        <span class="dp-spin inline-block shrink-0 rounded-full border-2 border-[var(--dp-color-surface-3)] border-t-[var(--dp-color-accent)]"
            :style="spinnerStyle" aria-hidden="true" />
        <span v-if="c.description" class="text-xs text-[var(--dp-color-fg-2)]">{{ c.description }}</span>
    </span>
</template>
