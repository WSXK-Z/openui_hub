<script setup lang="ts">
import {
    NumberFieldDecrement,
    NumberFieldIncrement,
    NumberFieldInput,
    NumberFieldRoot,
} from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpInputNumber', inheritAttrs: false })

export interface DpInputNumberComp {
    min: number | undefined
    max: number | undefined
    step: number
    disabled: boolean
}

export type DpInputNumberProps = DpProps<DpInputNumberComp>

const props = defineProps<DpInputNumberProps>()

const { comp: c, rootAttrs } = useDpProps<DpInputNumberComp>(props, {
    compDefaults: { step: 1, disabled: false },
})

const model = defineModel<number | undefined>({ default: undefined })

function onModelChange(value: number | null) {
    model.value = value ?? undefined
}
</script>

<template>
    <!-- 基于 reka-ui NumberField（受控 value / min / max / step，支持键盘步进与滚轮） -->
    <NumberFieldRoot v-bind="rootAttrs" :model-value="model ?? null" :min="c.min" :max="c.max" :step="c.step"
        :disabled="c.disabled" @update:model-value="onModelChange"
        class="dp-input-number inline-flex h-[var(--dp-size-btn-h)] items-stretch overflow-hidden rounded-[var(--dp-radius)] border border-[var(--dp-color-border-strong)] bg-[var(--dp-color-surface)] text-[var(--dp-color-fg)]">
        <NumberFieldDecrement aria-label="decrease"
            class="flex h-full w-8 cursor-pointer items-center justify-center border-r border-[var(--dp-color-border)] bg-transparent text-base leading-none transition-colors duration-[140ms] hover:bg-[var(--dp-color-surface-2)] disabled:cursor-not-allowed disabled:opacity-40">
            −
        </NumberFieldDecrement>
        <NumberFieldInput class="w-16 bg-transparent px-2 text-center text-sm outline-none disabled:opacity-50" />
        <NumberFieldIncrement aria-label="increase"
            class="flex h-full w-8 cursor-pointer items-center justify-center border-l border-[var(--dp-color-border)] bg-transparent text-base leading-none transition-colors duration-[140ms] hover:bg-[var(--dp-color-surface-2)] disabled:cursor-not-allowed disabled:opacity-40">
            +
        </NumberFieldIncrement>
    </NumberFieldRoot>
</template>
