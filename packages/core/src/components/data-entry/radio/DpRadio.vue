<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'

defineOptions({ name: 'DpRadio', inheritAttrs: false })

export interface DpRadioOption {
    label: string
    value: string | number
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
            class="inline-flex cursor-pointer items-center gap-2">
            <RadioGroupItem :value="String(option.value)"
                class="dp-radio inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] outline-none transition-colors data-[state=checked]:border-[var(--dp-color-primary)] disabled:cursor-not-allowed disabled:opacity-55">
                <RadioGroupIndicator class="block h-2.5 w-2.5 rounded-full bg-[var(--dp-color-primary)]" />
            </RadioGroupItem>
            <span class="text-sm">{{ option.label }}</span>
        </label>
    </RadioGroupRoot>
</template> 
