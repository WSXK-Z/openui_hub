<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps, DpSize, DpType } from '../../../types'

defineOptions({ name: 'DpTag', inheritAttrs: false })

export interface DpTagComp {
    closable: boolean
}

export type DpTagProps = DpProps<DpTagComp>

const props = defineProps<DpTagProps>()

const emit = defineEmits<{ (e: 'close', event: MouseEvent): void }>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpTagComp>(props, {
    compDefaults: { closable: false },
})

const TYPE_CLASSES: Record<DpType, string> = {
    default:
        'text-[var(--dp-color-text)] border-[var(--dp-color-border)] bg-[var(--dp-color-surface)]',
    primary:
        'text-[var(--dp-color-primary)] border-[color-mix(in_srgb,var(--dp-color-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--dp-color-primary)_8%,transparent)]',
    success:
        'text-[var(--dp-color-success)] border-[color-mix(in_srgb,var(--dp-color-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--dp-color-success)_8%,transparent)]',
    warning:
        'text-[var(--dp-color-warning)] border-[color-mix(in_srgb,var(--dp-color-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--dp-color-warning)_8%,transparent)]',
    danger:
        'text-[var(--dp-color-danger)] border-[color-mix(in_srgb,var(--dp-color-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--dp-color-danger)_8%,transparent)]',
    info: 'text-[var(--dp-color-info)] border-[color-mix(in_srgb,var(--dp-color-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--dp-color-info)_8%,transparent)]',
}

const SIZE_CLASSES: Record<DpSize, string> = {
    small: 'h-5 px-2 text-xs',
    medium: 'h-6 px-2.5 text-[13px]',
    large: 'h-7 px-3 text-sm',
}

const classes = computed(() => [
    'dp-tag',
    'inline-flex items-center gap-1 whitespace-nowrap leading-none border rounded-[var(--dp-radius-sm)]',
    `dp-tag--${s.value.variant}`,
    `dp-tag--${s.value.size}`,
    TYPE_CLASSES[s.value.variant],
    SIZE_CLASSES[s.value.size],
    s.value.round && 'dp-tag--round rounded-full',
])

function handleClose(event: MouseEvent) {
    emit('close', event)
}
</script>

<template>
    <span v-bind="rootAttrs" :class="classes">
        <slot />
        <button v-if="c.closable"
            class="dp-tag__close inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-sm leading-none text-current hover:bg-[color-mix(in_srgb,currentColor_20%,transparent)]"
            type="button" aria-label="close" @click="handleClose">
            ×
        </button>
    </span>
</template>
