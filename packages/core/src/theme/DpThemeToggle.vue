<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps, DpSize } from '../types'
import { useThemeController } from './themeContext'

defineOptions({ name: 'DpThemeToggle', inheritAttrs: false })

export interface DpThemeToggleComp {
    /** 是否在图标旁显示当前主题文字 */
    showLabel: boolean
    /** 自定义文字；为空时显示当前主题（浅色 / 深色） */
    label: string
}

export type DpThemeToggleProps = DpProps<DpThemeToggleComp>

const props = defineProps<DpThemeToggleProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpThemeToggleComp>(props, {
    compDefaults: { showLabel: false, label: '' },
})

const controller = useThemeController()

const isDark = controller.isDark

const actionLabel = computed(() => (isDark.value ? '切换到浅色主题' : '切换到深色主题'))
const displayLabel = computed(() => c.value.label || (isDark.value ? '深色' : '浅色'))

const sizeClass = computed(() => {
    const map: Record<DpSize, string> = {
        small: 'h-7 min-w-7 px-1.5 text-[11px] gap-1',
        medium: 'h-8 min-w-8 px-2 text-xs gap-1.5',
        large: 'h-9 min-w-9 px-2.5 text-sm gap-2',
    }
    return map[s.value.size]
})

function toggle() {
    controller.toggleMode()
}
</script>

<template>
    <button v-bind="rootAttrs" type="button"
        class="dp-theme-toggle inline-flex cursor-pointer items-center justify-center border border-[var(--dp-color-border)] bg-[var(--dp-color-surface-2)] font-medium text-[var(--dp-color-fg-2)] transition-[background-color,color,box-shadow] duration-[140ms] hover:bg-[var(--dp-color-surface-3)] hover:text-[var(--dp-color-fg)] focus-visible:outline-none focus-visible:shadow-[var(--dp-ring)]"
        :class="[sizeClass, s.round ? 'rounded-full' : 'rounded-[var(--dp-radius-sm)]']" :aria-label="actionLabel"
        :title="actionLabel" @click="toggle">
        <svg v-if="isDark" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
        <span v-if="c.showLabel" class="whitespace-nowrap">{{ displayLabel }}</span>
    </button>
</template>
