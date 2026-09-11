<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpInput', inheritAttrs: false })

export interface DpInputComp {
    type: string
    placeholder: string
    label: string
    disabled: boolean
    readonly: boolean
    clearable: boolean
}

export type DpInputProps = DpProps<DpInputComp>

const props = defineProps<DpInputProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpInputComp>(props, {
    compDefaults: { type: 'text', placeholder: '', label: '', disabled: false, readonly: false, clearable: false },
})

const model = defineModel<string>({ default: '' })

const sizeClass = computed(() =>
    s.value.size === 'small'
        ? 'h-[var(--dp-size-btn-h-sm)] text-[13px]'
        : s.value.size === 'large'
            ? 'h-[var(--dp-size-btn-h-lg)] text-base'
            : 'h-[var(--dp-size-btn-h)] text-sm',
)

function onInput(event: Event) {
    model.value = (event.target as HTMLInputElement).value
}

function clear() {
    model.value = ''
}
</script>

<template>
    <div v-bind="rootAttrs" class="dp-input flex w-full flex-col gap-1">
        <label v-if="c.label" class="text-[13px] text-[var(--dp-color-text-secondary)]">{{ c.label }}</label>
        <div class="relative inline-flex items-center">
            <input
                class="dp-input__inner w-full rounded-[var(--dp-radius)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] px-3 outline-none transition-colors focus:border-[var(--dp-color-primary)] disabled:opacity-55"
                :class="sizeClass" :type="c.type" :value="model" :placeholder="c.placeholder"
                :disabled="c.disabled" :readonly="c.readonly" @input="onInput" />
            <button v-if="c.clearable && model" type="button"
                class="dp-input__clear absolute right-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--dp-color-border)_60%,transparent)] text-[10px] leading-none hover:bg-[color-mix(in_srgb,var(--dp-color-border)_90%,transparent)]"
                aria-label="clear" @click="clear">
                ×
            </button>
        </div>
    </div>
</template>
