<script setup lang="ts">
import { computed } from 'vue'
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
    disabled?: boolean
}

export interface DpSelectComp {
    options: DpSelectOption[]
    placeholder: string
    disabled: boolean
    /** 展示清除按钮 */
    clearable: boolean
}

export type DpSelectProps = DpProps<DpSelectComp>

const props = defineProps<DpSelectProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpSelectComp>(props, {
    compDefaults: { options: [], placeholder: '请选择', disabled: false, clearable: false },
})

const model = defineModel<string | number>({ default: '' })

const sizeClass = computed(() =>
    s.value.size === 'small'
        ? 'h-[var(--dp-size-btn-h-sm)] text-xs'
        : s.value.size === 'large'
            ? 'h-[var(--dp-size-btn-h-lg)] text-base'
            : 'h-[var(--dp-size-btn-h)] text-sm',
)

const hasValue = computed(() => model.value !== '' && model.value !== undefined && model.value !== null)

function clear() {
    model.value = ''
}
</script>

<template>
    <SelectRoot v-model="model" :disabled="c.disabled">
        <SelectTrigger v-bind="rootAttrs"
            class="dp-select__trigger inline-flex w-full items-center justify-between gap-2 rounded-[var(--dp-radius)] border border-[var(--dp-color-border-strong)] bg-[var(--dp-color-surface)] px-3 text-[var(--dp-color-fg)] outline-none transition-[border-color,box-shadow] duration-[140ms] hover:border-[var(--dp-color-fg-2)] focus:border-[var(--dp-color-accent)] focus:shadow-[var(--dp-ring)] disabled:cursor-not-allowed disabled:bg-[var(--dp-color-surface-2)] disabled:text-[var(--dp-color-muted)]"
            :class="sizeClass">
            <SelectValue :placeholder="c.placeholder" />
            <span class="flex shrink-0 items-center gap-1">
                <span v-if="c.clearable && hasValue && !c.disabled" role="button" tabindex="-1"
                    class="dp-select__clear inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--dp-color-surface-3)] text-[10px] leading-none text-[var(--dp-color-fg-2)] hover:bg-[var(--dp-color-border-strong)]"
                    aria-label="clear" @pointerdown.stop.prevent @click.stop="clear">
                    ×
                </span>
                <span class="text-xs text-[var(--dp-color-muted)]">▾</span>
            </span>
        </SelectTrigger>
        <SelectPortal>
            <SelectContent
                class="dp-select__content z-[1000] min-w-48 rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] p-1 shadow-[var(--dp-shadow-3)]">
                <SelectViewport>
                    <SelectItem v-for="option in c.options" :key="String(option.value)" :value="String(option.value)"
                        :disabled="option.disabled"
                        class="dp-select__item cursor-pointer rounded-[var(--dp-radius-sm)] px-3 py-1.5 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[state=checked]:bg-[var(--dp-color-accent-soft)] data-[highlighted]:bg-[var(--dp-color-surface-2)]">
                        <SelectItemText>{{ option.label }}</SelectItemText>
                    </SelectItem>
                </SelectViewport>
            </SelectContent>
        </SelectPortal>
    </SelectRoot>
</template>
