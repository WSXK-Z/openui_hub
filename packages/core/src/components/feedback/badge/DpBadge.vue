<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpBadge', inheritAttrs: false })

export interface DpBadgeComp {
    value: string | number | undefined
    max: number
    dot: boolean
    showZero: boolean
    color: string
}

export type DpBadgeProps = DpProps<DpBadgeComp>

const props = defineProps<DpBadgeProps>()

const { comp: c, rootAttrs } = useDpProps<DpBadgeComp>(props, {
    compDefaults: { max: 99, dot: false, showZero: false, color: '' },
})

const display = computed(() => {
    if (c.value.dot || c.value.value === undefined || c.value.value === null || c.value.value === '')
        return ''
    const num = Number(c.value.value)
    if (!Number.isNaN(num)) {
        if (num === 0 && !c.value.showZero) return ''
        if (typeof c.value.max === 'number' && num > c.value.max) return `${c.value.max}+`
    }
    return String(c.value.value)
})

const show = computed(() => c.value.dot || display.value !== '')

const supClasses = computed(() => [
    'dp-badge__sup absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-[var(--dp-color-danger)]',
    c.value.dot
        ? 'dp-badge__sup--dot h-2 w-2 min-w-0 rounded-full'
        : 'min-w-[18px] min-h-[18px] px-1.5 text-xs leading-[18px] text-white rounded-[9px]',
])

const badgeStyle = computed(() => (c.value.color ? { backgroundColor: c.value.color } : null))
</script>

<template>
    <span v-bind="rootAttrs" class="dp-badge relative inline-flex align-middle">
        <slot />
        <sup v-if="show" :class="supClasses" :style="badgeStyle">
            {{ display }}
        </sup>
    </span>
</template>
