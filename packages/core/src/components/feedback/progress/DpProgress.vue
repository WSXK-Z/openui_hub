<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpThemeProps } from '../../../types'
import { ProgressIndicator, ProgressRoot } from 'reka-ui'

defineOptions({ name: 'DpProgress', inheritAttrs: false })

export interface DpProgressComp {
    max: number
}

export type DpProgressStatus = 'default' | 'success' | 'warning' | 'danger'

/** 进度条外观扩展：线形 / 环形、状态色与百分比文案 */
export interface DpProgressTheme extends DpThemeProps {
    type?: 'line' | 'circle'
    status?: DpProgressStatus
    /** 显示百分比文案 */
    showIndicator?: boolean
}

export type DpProgressProps = {
    theme?: DpProgressTheme
    comp?: Partial<DpProgressComp>
}

const props = defineProps<DpProgressProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpProgressComp>(props, {
    compDefaults: { max: 100 },
})

const model = defineModel<number>({ default: 0 })

const t = computed(() => props.theme ?? {})
const progressType = computed(() => t.value.type ?? 'line')
const status = computed(() => t.value.status ?? 'default')
const showIndicator = computed(() => t.value.showIndicator ?? false)

const percent = computed(() => {
    const value = Math.min(Math.max(model.value, 0), c.value.max)
    return c.value.max > 0 ? (value / c.value.max) * 100 : 0
})

const roundedPercent = computed(() => Math.round(percent.value))

const INDICATOR_CLASSES: Record<DpProgressStatus, string> = {
    default: 'bg-[var(--dp-color-accent)] stroke-[var(--dp-color-accent)]',
    success: 'bg-[var(--dp-color-success)] stroke-[var(--dp-color-success)]',
    warning: 'bg-[var(--dp-color-warning)] stroke-[var(--dp-color-warning)]',
    danger: 'bg-[var(--dp-color-danger)] stroke-[var(--dp-color-danger)]',
}

const TEXT_CLASSES: Record<DpProgressStatus, string> = {
    default: 'text-[var(--dp-color-accent)]',
    success: 'text-[var(--dp-color-success)]',
    warning: 'text-[var(--dp-color-warning)]',
    danger: 'text-[var(--dp-color-danger)]',
}

const sizeMap = { small: 48, medium: 64, large: 80 } as const
const circleSize = computed(() => sizeMap[s.value.size])
const CIRCLE_RADIUS = 18
const CIRCLE_LENGTH = 2 * Math.PI * CIRCLE_RADIUS
const dashOffset = computed(() => CIRCLE_LENGTH * (1 - percent.value / 100))
</script>

<template>
    <div v-bind="rootAttrs" class="dp-progress"
        :class="progressType === 'circle' ? 'inline-flex items-center gap-3' : 'flex w-full items-center gap-3'">
        <svg v-if="progressType === 'circle'" class="dp-progress__circle shrink-0" :width="circleSize"
            :height="circleSize" viewBox="0 0 40 40" role="img" :aria-label="`${roundedPercent}%`">
            <circle cx="20" cy="20" :r="CIRCLE_RADIUS" fill="none" stroke="var(--dp-color-surface-3)"
                stroke-width="3" />
            <circle class="dp-progress__indicator transition-[stroke-dashoffset] duration-[320ms]" cx="20" cy="20"
                :r="CIRCLE_RADIUS" fill="none" stroke-width="3" stroke-linecap="round"
                :stroke-dasharray="CIRCLE_LENGTH" :stroke-dashoffset="dashOffset" transform="rotate(-90 20 20)"
                :class="INDICATOR_CLASSES[status]" />
        </svg>
        <ProgressRoot v-else :model-value="model" :max="c.max"
            class="dp-progress__bar inline-flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--dp-color-surface-3)]">
            <ProgressIndicator class="dp-progress__indicator h-full rounded-full transition-[width] duration-[320ms]"
                :class="INDICATOR_CLASSES[status]" :style="{ width: `${percent}%` }" />
        </ProgressRoot>
        <span v-if="showIndicator"
            class="dp-progress__indicator-text shrink-0 text-xs font-medium tabular-nums"
            :class="TEXT_CLASSES[status]">
            {{ roundedPercent }}%
        </span>
    </div>
</template>
