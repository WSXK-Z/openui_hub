<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpSpin', inheritAttrs: false })

export interface DpSpinComp {
    size: number | string
}

export type DpSpinProps = DpProps<DpSpinComp>

const props = defineProps<DpSpinProps>()

const { comp: c, rootAttrs } = useDpProps<DpSpinComp>(props, {
    compDefaults: { size: 24 },
})

const spinStyle = computed(() => ({
    width: typeof c.value.size === 'number' ? `${c.value.size}px` : c.value.size,
    height: typeof c.value.size === 'number' ? `${c.value.size}px` : c.value.size,
    animation: 'dp-spin 0.6s linear infinite',
}))
</script>

<template>
    <span v-bind="rootAttrs"
        class="dp-spin inline-block shrink-0 rounded-full border-2 border-[var(--dp-color-border)] border-t-[var(--dp-color-primary)]"
        :style="spinStyle" role="status" aria-label="loading" />
</template>
