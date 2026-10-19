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
    /** 最大输入长度，0 = 不限制 */
    maxlength: number
    /** 显示字数统计（配合 maxlength） */
    showCount: boolean
}

export type DpInputProps = DpProps<DpInputComp>

const props = defineProps<DpInputProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpInputComp>(props, {
    compDefaults: {
        type: 'text',
        placeholder: '',
        label: '',
        disabled: false,
        readonly: false,
        clearable: false,
        maxlength: 0,
        showCount: false,
    },
})

const model = defineModel<string>({ default: '' })

const sizeClass = computed(() =>
    s.value.size === 'small'
        ? 'h-[var(--dp-size-btn-h-sm)] text-xs'
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
        <label v-if="c.label" class="text-xs font-medium text-[var(--dp-color-fg-2)]">{{ c.label }}</label>
        <div class="dp-input__control flex items-center rounded-[var(--dp-radius)] border border-[var(--dp-color-border-strong)] bg-[var(--dp-color-surface)] transition-[border-color,box-shadow] duration-[140ms] hover:border-[var(--dp-color-fg-2)] focus-within:border-[var(--dp-color-accent)] focus-within:shadow-[var(--dp-ring)]"
            :class="[
                sizeClass,
                c.disabled && 'cursor-not-allowed border-[var(--dp-color-border)] bg-[var(--dp-color-surface-2)]',
            ]">
            <span v-if="$slots.prefix"
                class="dp-input__prefix flex shrink-0 items-center pl-3 text-[var(--dp-color-muted)]">
                <slot name="prefix" />
            </span>
            <input
                class="dp-input__inner h-full min-w-0 flex-1 bg-transparent px-3 text-[var(--dp-color-fg)] outline-none placeholder:text-[var(--dp-color-muted)] disabled:cursor-not-allowed disabled:text-[var(--dp-color-muted)]"
                :type="c.type" :value="model" :placeholder="c.placeholder" :disabled="c.disabled"
                :readonly="c.readonly" :maxlength="c.maxlength > 0 ? c.maxlength : undefined" @input="onInput" />
            <span v-if="c.showCount"
                class="dp-input__count shrink-0 pl-1 text-[11px] tabular-nums text-[var(--dp-color-muted)]"
                :class="c.clearable && model ? '' : 'pr-3'">
                {{ model.length }}<template v-if="c.maxlength > 0">/{{ c.maxlength }}</template>
            </span>
            <span v-if="$slots.suffix"
                class="dp-input__suffix flex shrink-0 items-center pr-3 text-[var(--dp-color-muted)]">
                <slot name="suffix" />
            </span>
            <button v-if="c.clearable && model && !c.disabled && !c.readonly" type="button"
                class="dp-input__clear mr-2 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--dp-color-surface-3)] text-[10px] leading-none text-[var(--dp-color-fg-2)] hover:bg-[var(--dp-color-border-strong)]"
                aria-label="clear" @click="clear">
                ×
            </button>
        </div>
    </div>
</template>
