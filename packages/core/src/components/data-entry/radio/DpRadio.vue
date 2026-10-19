<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'

defineOptions({ name: 'DpRadio', inheritAttrs: false })

export interface DpRadioOption {
    label: string
    value: string | number
    disabled?: boolean
}

export interface DpRadioComp {
    options: DpRadioOption[]
    disabled: boolean
    vertical: boolean
}

export type DpRadioProps = DpProps<DpRadioComp>

const props = defineProps<DpRadioProps>()

const { comp: c, rootAttrs } = useDpProps<DpRadioComp>(props, {
    compDefaults: { options: [], disabled: false, vertical: false },
})

const model = defineModel<string | number>({ default: '' })

function onChange(value: unknown) {
    model.value = typeof value === 'number' ? value : String(value ?? '')
}
</script>

<template>
    <RadioGroupRoot v-bind="rootAttrs" :model-value="String(model ?? '')" :disabled="c.disabled"
        @update:model-value="onChange"
        class="dp-radio-group inline-flex" :class="c.vertical ? 'flex-col gap-2' : 'flex-row flex-wrap gap-4'">
        <label v-for="option in c.options" :key="String(option.value)"
            class="inline-flex items-center gap-2" :class="option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'">
            <RadioGroupItem :value="String(option.value)" :disabled="option.disabled"
                class="dp-radio inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--dp-color-border-strong)] bg-[var(--dp-color-surface)] outline-none transition-[border-color,box-shadow] duration-[140ms] data-[state=checked]:border-[var(--dp-color-accent)] focus-visible:shadow-[var(--dp-ring)] disabled:cursor-not-allowed disabled:opacity-50">
                <RadioGroupIndicator class="block h-2.5 w-2.5 rounded-full bg-[var(--dp-color-accent)]" />
            </RadioGroupItem>
            <span class="text-sm text-[var(--dp-color-fg-2)]">{{ option.label }}</span>
        </label>
    </RadioGroupRoot>
</template> 
