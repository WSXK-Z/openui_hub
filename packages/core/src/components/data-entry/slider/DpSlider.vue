<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpSlider', inheritAttrs: false })

export interface DpSliderComp {
    min: number
    max: number
    step: number
    disabled: boolean
}

export type DpSliderProps = DpProps<DpSliderComp>

const props = defineProps<DpSliderProps>()

const { comp: c, rootAttrs } = useDpProps<DpSliderComp>(props, {
    compDefaults: { min: 0, max: 100, step: 1, disabled: false },
})

const model = defineModel<number>({ default: 0 })

function onValue(value: number[] | undefined) {
    const next = value?.[0]
    if (typeof next === 'number') model.value = next
}
</script>

<template>
    <!-- 基于 reka-ui Slider：支持键盘 / 点击轨道 / 触摸，受控 value -->
    <SliderRoot v-bind="rootAttrs" :model-value="[model]" :min="c.min" :max="c.max" :step="c.step"
        :disabled="c.disabled"
        class="dp-slider relative flex h-4 w-full max-w-xs cursor-pointer touch-none select-none items-center"
        @update:model-value="onValue">
        <SliderTrack
            class="relative h-1.5 grow rounded-full bg-[color-mix(in_srgb,var(--dp-color-border)_70%,transparent)]">
            <SliderRange class="absolute h-full rounded-full bg-[var(--dp-color-primary)]" />
        </SliderTrack>
        <SliderThumb
            class="block h-4 w-4 rounded-full border-2 border-[var(--dp-color-primary)] bg-[var(--dp-color-surface)] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--dp-color-primary)_40%,transparent)]" />
    </SliderRoot>
</template>
