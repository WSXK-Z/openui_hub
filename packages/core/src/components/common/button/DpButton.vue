<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps, DpSize, DpType } from '../../../types'

defineOptions({ name: 'DpButton', inheritAttrs: false })

export interface DpButtonComp {
    loading: boolean
    disabled: boolean
    nativeType: 'button' | 'submit' | 'reset'
}

export type DpButtonProps = DpProps<DpButtonComp>

const props = defineProps<DpButtonProps>()

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpButtonComp>(props, {
    compDefaults: { loading: false, disabled: false, nativeType: 'button' },
})

// 颜色 / 尺寸均以 --dp-* CSS 变量表达，外部可覆盖（设计文档 §8.4）
// 填充态（ghost=false）
const FILLED_CLASSES: Record<DpType, string> = {
    default:
        'bg-[var(--dp-color-surface)] border-[var(--dp-color-border)] text-[var(--dp-color-text)] hover:border-[var(--dp-color-border-hover)] hover:text-[var(--dp-color-primary)]',
    primary: 'bg-[var(--dp-color-primary)] text-white hover:bg-[var(--dp-color-primary-hover)]',
    success: 'bg-[var(--dp-color-success)] text-white hover:bg-[var(--dp-color-success-hover)]',
    warning: 'bg-[var(--dp-color-warning)] text-white hover:bg-[var(--dp-color-warning-hover)]',
    danger: 'bg-[var(--dp-color-danger)] text-white hover:bg-[var(--dp-color-danger-hover)]',
    info: 'bg-[var(--dp-color-info)] text-white hover:bg-[var(--dp-color-info-hover)]',
}
// 幽灵态（ghost=true）：无边框无底色，文字色随 variant（default 次要文字色、hover 转 primary）
const GHOST_CLASSES: Record<DpType, string> = {
    default:
        'text-[var(--dp-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--dp-color-primary)_12%,transparent)] hover:text-[var(--dp-color-primary)]',
    primary: 'text-[var(--dp-color-primary)] hover:bg-[color-mix(in_srgb,var(--dp-color-primary)_12%,transparent)]',
    success: 'text-[var(--dp-color-success)] hover:bg-[color-mix(in_srgb,var(--dp-color-success)_12%,transparent)]',
    warning: 'text-[var(--dp-color-warning)] hover:bg-[color-mix(in_srgb,var(--dp-color-warning)_12%,transparent)]',
    danger: 'text-[var(--dp-color-danger)] hover:bg-[color-mix(in_srgb,var(--dp-color-danger)_12%,transparent)]',
    info: 'text-[var(--dp-color-info)] hover:bg-[color-mix(in_srgb,var(--dp-color-info)_12%,transparent)]',
}
// icon 模式下宽高取同一 size 变量，保证方形（可用 style.cssVars 按实例改尺寸）
const SIZE_VAR: Record<DpSize, string> = {
    small: '--dp-size-btn-h-sm',
    medium: '--dp-size-btn-h',
    large: '--dp-size-btn-h-lg',
}
const SIZE_CLASSES: Record<DpSize, string> = {
    small: 'h-[var(--dp-size-btn-h-sm)] px-3 text-[13px]',
    medium: 'h-[var(--dp-size-btn-h)] px-4 text-sm',
    large: 'h-[var(--dp-size-btn-h-lg)] px-6 text-base',
}

const classes = computed(() => [
    'dp-button',
    `dp-button--${s.value.variant}`,
    `dp-button--${s.value.size}`,
    s.value.ghost && 'dp-button--ghost',
    s.value.icon && 'dp-button--icon',
    'inline-flex items-center justify-center whitespace-nowrap select-none',
    s.value.icon ? 'gap-0 border-transparent' : 'gap-1.5 border border-transparent',
    'rounded-[var(--dp-radius)] leading-none cursor-pointer',
    'transition-colors duration-200',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-[var(--dp-color-primary)]',
    'disabled:opacity-55 disabled:cursor-not-allowed',
    s.value.ghost ? GHOST_CLASSES[s.value.variant] : FILLED_CLASSES[s.value.variant],
    s.value.icon
        ? `h-[var(${SIZE_VAR[s.value.size]})] w-[var(${SIZE_VAR[s.value.size]})] p-0`
        : SIZE_CLASSES[s.value.size],
    s.value.round && 'dp-button--round rounded-full',
    s.value.block && 'dp-button--block flex w-full',
    c.value.loading && 'is-loading',
])

function handleClick(event: MouseEvent) {
    if (c.value.loading || c.value.disabled) return
    emit('click', event)
}
</script>

<template>
    <button v-bind="rootAttrs" :class="classes" :type="c.nativeType" :disabled="c.disabled || c.loading"
        @click="handleClick">
        <span v-if="c.loading"
            class="dp-button__spinner inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
            style="animation: dp-spin 0.6s linear infinite" aria-hidden="true" />
        <slot />
    </button>
</template>
