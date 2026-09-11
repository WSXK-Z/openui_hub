<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import { ProgressIndicator, ProgressRoot } from 'reka-ui'

defineOptions({ name: 'DpProgress', inheritAttrs: false })

export interface DpProgressComp {
    max: number
}

export type DpProgressProps = DpProps<DpProgressComp>

const props = defineProps<DpProgressProps>()

const { comp: c, rootAttrs } = useDpProps<DpProgressComp>(props, {
    compDefaults: { max: 100 },
})

const model = defineModel<number>({ default: 0 })

const percent = computed(() => {
    const value = Math.min(Math.max(model.value, 0), c.value.max)
    return c.value.max > 0 ? (value / c.value.max) * 100 : 0
})
</script>

<template>
    <ProgressRoot v-bind="rootAttrs" :model-value="model" :max="c.max"
        class="dp-progress inline-flex h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--dp-color-border)_50%,transparent)]">
        <ProgressIndicator
            class="dp-progress__indicator h-full rounded-full bg-[var(--dp-color-primary)] transition-all"
            :style="{ width: `${percent}%` }" />
    </ProgressRoot>
</template>
