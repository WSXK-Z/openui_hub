<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

defineOptions({ name: 'DpCheckbox', inheritAttrs: false })

export interface DpCheckboxComp {
    disabled: boolean
    label: string
}

export type DpCheckboxProps = DpProps<DpCheckboxComp>

const props = defineProps<DpCheckboxProps>()

const { comp: c, rootAttrs } = useDpProps<DpCheckboxComp>(props, {
    compDefaults: { disabled: false, label: '' },
})

const checked = defineModel<boolean>({ default: false })
</script>

<template>
    <label v-bind="rootAttrs" class="dp-checkbox-wrapper inline-flex cursor-pointer items-center gap-2">
        <CheckboxRoot :model-value="checked" :disabled="c.disabled"
            @update:model-value="(v: unknown) => (checked = v === true)"
            class="dp-checkbox inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--dp-radius-sm)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] outline-none transition-colors data-[state=checked]:border-[var(--dp-color-primary)] data-[state=checked]:bg-[var(--dp-color-primary)] disabled:cursor-not-allowed disabled:opacity-55">
            <CheckboxIndicator class="text-white">
                <span class="block text-xs leading-none">✓</span>
            </CheckboxIndicator>
        </CheckboxRoot>
        <span v-if="c.label" class="text-sm">{{ c.label }}</span>
    </label>
</template>
