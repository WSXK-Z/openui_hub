<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpSize, DpThemeProps, DpType } from '../../../types'

defineOptions({ name: 'DpButton', inheritAttrs: false })

export interface DpButtonComp {
    loading: boolean
    disabled: boolean
    nativeType: 'button' | 'submit' | 'reset'
}

/** 按钮外观扩展：在通用 theme 之上补充 Naive UI 风格的形态 */
export interface DpButtonTheme extends DpThemeProps {
    /** 虚线边框 */
    dashed?: boolean
    /** 纯文字按钮：无底色与边框 */
    text?: boolean
    /** 次级按钮：语义浅底 + 语义文字 */
    quaternary?: boolean
    /** 圆形按钮（与 round 等价，保留 Naive UI 命名） */
    circle?: boolean
    /** 加粗文字 */
    strong?: boolean
}

export type DpButtonProps = {
    theme?: DpButtonTheme
    comp?: Partial<DpButtonComp>
}

const props = defineProps<DpButtonProps>()

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpButtonComp>(props, {
    compDefaults: { loading: false, disabled: false, nativeType: 'button' },
})

const t = computed(() => props.theme ?? {})

// 颜色 / 尺寸均以 --dp-* CSS 变量表达，外部可覆盖（设计文档 §8.4）
// 填充态（ghost=false）
const FILLED_CLASSES: Record<DpType, string> = {
    default:
        'bg-[var(--dp-color-surface)] border-[var(--dp-color-border-strong)] text-[var(--dp-color-fg)] hover:bg-[var(--dp-color-surface-2)]',
    primary:
        'bg-[var(--dp-color-accent)] text-[var(--dp-color-accent-fg)] hover:bg-[var(--dp-color-accent-hover)]',
    success:
        'bg-[var(--dp-color-success)] text-[var(--dp-color-bg)] hover:bg-[var(--dp-color-success-hover)]',
    warning:
        'bg-[var(--dp-color-warning)] text-[var(--dp-color-bg)] hover:bg-[var(--dp-color-warning-hover)]',
    danger: 'bg-[var(--dp-color-danger)] text-[var(--dp-color-bg)] hover:bg-[var(--dp-color-danger-hover)]',
    info: 'bg-[var(--dp-color-info)] text-[var(--dp-color-bg)] hover:bg-[var(--dp-color-info-hover)]',
}
// 幽灵态（ghost=true）：无边框无底色，文字色随 variant（default 次要文字色、hover 转正文色）
const GHOST_CLASSES: Record<DpType, string> = {
    default:
        'bg-transparent text-[var(--dp-color-fg-2)] hover:bg-[var(--dp-color-surface-2)] hover:text-[var(--dp-color-fg)]',
    primary: 'bg-transparent text-[var(--dp-color-accent)] hover:bg-[var(--dp-color-accent-soft)]',
    success:
        'bg-transparent text-[var(--dp-color-success)] hover:bg-[color-mix(in_srgb,var(--dp-color-success)_12%,transparent)]',
    warning:
        'bg-transparent text-[var(--dp-color-warning)] hover:bg-[color-mix(in_srgb,var(--dp-color-warning)_12%,transparent)]',
    danger:
        'bg-transparent text-[var(--dp-color-danger)] hover:bg-[color-mix(in_srgb,var(--dp-color-danger)_12%,transparent)]',
    info: 'bg-transparent text-[var(--dp-color-info)] hover:bg-[color-mix(in_srgb,var(--dp-color-info)_12%,transparent)]',
}
// 虚线态：透明底 + 语义边框/文字
const DASHED_CLASSES: Record<DpType, string> = {
    default:
        '!border-[var(--dp-color-border-strong)] text-[var(--dp-color-fg)] bg-transparent hover:bg-[var(--dp-color-surface-2)]',
    primary:
        '!border-[var(--dp-color-accent)] text-[var(--dp-color-accent)] bg-transparent hover:bg-[var(--dp-color-accent-soft)]',
    success:
        '!border-[var(--dp-color-success)] text-[var(--dp-color-success)] bg-transparent hover:bg-[color-mix(in_srgb,var(--dp-color-success)_12%,transparent)]',
    warning:
        '!border-[var(--dp-color-warning)] text-[var(--dp-color-warning)] bg-transparent hover:bg-[color-mix(in_srgb,var(--dp-color-warning)_12%,transparent)]',
    danger:
        '!border-[var(--dp-color-danger)] text-[var(--dp-color-danger)] bg-transparent hover:bg-[color-mix(in_srgb,var(--dp-color-danger)_12%,transparent)]',
    info: '!border-[var(--dp-color-info)] text-[var(--dp-color-info)] bg-transparent hover:bg-[color-mix(in_srgb,var(--dp-color-info)_12%,transparent)]',
}
// 纯文字态：无底色、无边框
const TEXT_CLASSES: Record<DpType, string> = {
    default:
        'border-transparent bg-transparent text-[var(--dp-color-fg-2)] hover:text-[var(--dp-color-fg)]',
    primary:
        'border-transparent bg-transparent text-[var(--dp-color-accent)] hover:text-[var(--dp-color-accent-hover)]',
    success:
        'border-transparent bg-transparent text-[var(--dp-color-success)] hover:text-[var(--dp-color-success-hover)]',
    warning:
        'border-transparent bg-transparent text-[var(--dp-color-warning)] hover:text-[var(--dp-color-warning-hover)]',
    danger:
        'border-transparent bg-transparent text-[var(--dp-color-danger)] hover:text-[var(--dp-color-danger-hover)]',
    info: 'border-transparent bg-transparent text-[var(--dp-color-info)] hover:text-[var(--dp-color-info-hover)]',
}
// 次级态：语义浅底 + 语义文字
const QUATERNARY_CLASSES: Record<DpType, string> = {
    default:
        'border-transparent bg-[var(--dp-color-surface-2)] text-[var(--dp-color-fg-2)] hover:bg-[var(--dp-color-surface-3)]',
    primary:
        'border-transparent bg-[var(--dp-color-accent-soft)] text-[var(--dp-color-accent)] hover:bg-[color-mix(in_srgb,var(--dp-color-accent)_18%,transparent)]',
    success:
        'border-transparent bg-[color-mix(in_srgb,var(--dp-color-success)_12%,transparent)] text-[var(--dp-color-success)] hover:bg-[color-mix(in_srgb,var(--dp-color-success)_18%,transparent)]',
    warning:
        'border-transparent bg-[color-mix(in_srgb,var(--dp-color-warning)_12%,transparent)] text-[var(--dp-color-warning)] hover:bg-[color-mix(in_srgb,var(--dp-color-warning)_18%,transparent)]',
    danger:
        'border-transparent bg-[color-mix(in_srgb,var(--dp-color-danger)_12%,transparent)] text-[var(--dp-color-danger)] hover:bg-[color-mix(in_srgb,var(--dp-color-danger)_18%,transparent)]',
    info: 'border-transparent bg-[color-mix(in_srgb,var(--dp-color-info)_12%,transparent)] text-[var(--dp-color-info)] hover:bg-[color-mix(in_srgb,var(--dp-color-info)_18%,transparent)]',
}
// icon 模式下宽高取同一 size 变量，保证方形（可用 style.cssVars 按实例改尺寸）
const SIZE_VAR: Record<DpSize, string> = {
    small: '--dp-size-btn-h-sm',
    medium: '--dp-size-btn-h',
    large: '--dp-size-btn-h-lg',
}
const SIZE_CLASSES: Record<DpSize, string> = {
    small: 'h-[var(--dp-size-btn-h-sm)] px-3 text-xs rounded-[var(--dp-radius-sm)]',
    medium: 'h-[var(--dp-size-btn-h)] px-4 text-sm rounded-[var(--dp-radius)]',
    large: 'h-[var(--dp-size-btn-h-lg)] px-6 text-base rounded-[var(--dp-radius)]',
}

const variantClasses = computed(() => {
    if (t.value.dashed) return DASHED_CLASSES[s.value.variant]
    if (t.value.text) return TEXT_CLASSES[s.value.variant]
    if (t.value.quaternary) return QUATERNARY_CLASSES[s.value.variant]
    return s.value.ghost ? GHOST_CLASSES[s.value.variant] : FILLED_CLASSES[s.value.variant]
})

const classes = computed(() => [
    'dp-button',
    `dp-button--${s.value.variant}`,
    `dp-button--${s.value.size}`,
    s.value.ghost && 'dp-button--ghost',
    t.value.dashed && 'dp-button--dashed',
    t.value.text && 'dp-button--text',
    t.value.quaternary && 'dp-button--quaternary',
    s.value.icon && 'dp-button--icon',
    'inline-flex items-center justify-center whitespace-nowrap select-none font-medium',
    s.value.icon ? 'gap-0 border-transparent' : 'gap-2 border border-transparent',
    'leading-none cursor-pointer active:translate-y-px',
    'transition-[background-color,border-color,color,transform] duration-[140ms] ease-[var(--dp-ease-standard)]',
    'focus-visible:outline-none focus-visible:shadow-[var(--dp-ring)]',
    'disabled:opacity-[0.45] disabled:cursor-not-allowed disabled:active:translate-y-0',
    variantClasses.value,
    !s.value.icon && t.value.dashed && 'border-dashed',
    s.value.icon
        ? `h-[var(${SIZE_VAR[s.value.size]})] w-[var(${SIZE_VAR[s.value.size]})] p-0`
        : SIZE_CLASSES[s.value.size],
    (s.value.round || t.value.circle) && 'dp-button--round rounded-full',
    t.value.strong && 'font-semibold',
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
