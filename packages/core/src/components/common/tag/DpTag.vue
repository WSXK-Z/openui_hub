<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps, DpSize, DpType } from '../../../types'

defineOptions({ name: 'DpTag', inheritAttrs: false })

export interface DpTagComp {
    closable: boolean
    /** 禁用：不可点击、不可关闭 */
    disabled: boolean
    /** 可选择：点击切换选中态 */
    checkable: boolean
}

export type DpTagProps = DpProps<DpTagComp>

const props = defineProps<DpTagProps>()

const emit = defineEmits<{ (e: 'close', event: MouseEvent): void }>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpTagComp>(props, {
    compDefaults: { closable: false, disabled: false, checkable: false },
    themeDefaults: { bordered: true },
})

const checked = defineModel<boolean>('checked', { default: false })

const TYPE_CLASSES: Record<DpType, string> = {
    default:
        'text-[var(--dp-color-fg-2)] border-[var(--dp-color-border)] bg-[var(--dp-color-surface-3)]',
    primary: 'text-[var(--dp-color-accent)] border-transparent bg-[var(--dp-color-accent-soft)]',
    success:
        'text-[var(--dp-color-ok)] border-transparent bg-[color-mix(in_srgb,var(--dp-color-ok)_14%,transparent)]',
    warning:
        'text-[var(--dp-color-warn)] border-transparent bg-[color-mix(in_srgb,var(--dp-color-warn)_18%,transparent)]',
    danger:
        'text-[var(--dp-color-danger)] border-transparent bg-[color-mix(in_srgb,var(--dp-color-danger)_12%,transparent)]',
    info: 'text-[var(--dp-color-info)] border-transparent bg-[color-mix(in_srgb,var(--dp-color-info)_14%,transparent)]',
}

const SIZE_CLASSES: Record<DpSize, string> = {
    small: 'h-5 px-2 text-[11px]',
    medium: 'h-[22px] px-2 text-[11px]',
    large: 'h-6 px-2.5 text-xs',
}

const classes = computed(() => [
    'dp-tag',
    'inline-flex items-center gap-[5px] whitespace-nowrap leading-none rounded-[var(--dp-radius-sm)] font-medium',
    s.value.bordered ? 'border' : 'border border-transparent',
    `dp-tag--${s.value.variant}`,
    `dp-tag--${s.value.size}`,
    TYPE_CLASSES[s.value.variant],
    SIZE_CLASSES[s.value.size],
    s.value.round && 'dp-tag--round rounded-full',
    c.value.checkable && 'dp-tag--checkable cursor-pointer select-none transition-colors',
    c.value.checkable &&
        checked.value &&
        '!border-[var(--dp-color-accent)] !text-[var(--dp-color-accent)] !bg-[var(--dp-color-accent-soft)]',
    c.value.disabled && 'dp-tag--disabled cursor-not-allowed opacity-50',
])

function toggleChecked() {
    if (!c.value.checkable || c.value.disabled) return
    checked.value = !checked.value
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleChecked()
}

function handleClose(event: MouseEvent) {
    if (c.value.disabled) return
    emit('close', event)
}
</script>

<template>
    <span v-bind="rootAttrs" :class="classes" :role="c.checkable ? 'checkbox' : undefined"
        :aria-checked="c.checkable ? checked : undefined"
        :aria-disabled="c.disabled || undefined"
        :tabindex="c.checkable && !c.disabled ? 0 : undefined" @click="toggleChecked"
        @keydown="handleKeydown">
        <slot />
        <button v-if="c.closable"
            class="dp-tag__close inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-transparent text-sm leading-none text-current hover:bg-[color-mix(in_srgb,currentColor_20%,transparent)] disabled:cursor-not-allowed"
            type="button" aria-label="close" :disabled="c.disabled" @click.stop="handleClose">
            ×
        </button>
    </span>
</template>
