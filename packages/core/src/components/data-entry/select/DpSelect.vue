<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import {
    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport,
} from 'reka-ui'

defineOptions({ name: 'DpSelect', inheritAttrs: false })

export interface DpSelectOption {
    label: string
    value: string | number
}

export interface DpSelectComp {
    options: DpSelectOption[]
    placeholder: string
    disabled: boolean
}

export type DpSelectProps = DpProps<DpSelectComp>

const props = defineProps<DpSelectProps>()

const { comp: c, rootAttrs } = useDpProps<DpSelectComp>(props, {
    compDefaults: { options: [], placeholder: '请选择', disabled: false },
})

const model = defineModel<string | number>({ default: '' })
</script>

<template>
    <SelectRoot v-model="model" :disabled="c.disabled">
        <SelectTrigger
            v-bind="rootAttrs"
            class="dp-select__trigger inline-flex h-[var(--dp-size-btn-h)] w-full items-center justify-between gap-2 rounded-[var(--dp-radius)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] px-3 text-sm outline-none transition-colors focus:border-[var(--dp-color-primary)] disabled:opacity-55">
            <SelectValue :placeholder="c.placeholder" />
            <span class="text-xs opacity-60">▾</span>
        </SelectTrigger>
        <SelectPortal>
            <SelectContent
                class="dp-select__content z-[1000] min-w-48 rounded-[var(--dp-radius)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] p-1 shadow-md">
                <SelectViewport>
                    <SelectItem v-for="option in c.options" :key="String(option.value)" :value="String(option.value)"
                        class="dp-select__item cursor-pointer rounded-[var(--dp-radius-sm)] px-3 py-1.5 text-sm outline-none data-[state=checked]:bg-[color-mix(in_srgb,var(--dp-color-primary)_10%,transparent)] data-[highlighted]:bg-[color-mix(in_srgb,var(--dp-color-primary)_15%,transparent)]">
                        <SelectItemText>{{ option.label }}</SelectItemText>
                    </SelectItem>
                </SelectViewport>
            </SelectContent>
        </SelectPortal>
    </SelectRoot>
</template>
