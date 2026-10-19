<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps, DpSize } from '../types'
import { useThemeController } from './themeContext'
import type { DpThemeMode } from './themeMode'

defineOptions({ name: 'DpThemeSwitch', inheritAttrs: false })

export interface DpThemeSwitchComp {
    /** 是否显示文字标签 */
    showLabels: boolean
}

export type DpThemeSwitchProps = DpProps<DpThemeSwitchComp>

const props = defineProps<DpThemeSwitchProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpThemeSwitchComp>(props, {
    compDefaults: { showLabels: true },
})

const controller = useThemeController()

interface ThemeOption {
    value: DpThemeMode
    label: string
    paths: string[]
}

const OPTIONS: ThemeOption[] = [
    {
        value: 'light',
        label: '浅色',
        paths: [
            'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
            'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
        ],
    },
    {
        value: 'dark',
        label: '深色',
        paths: ['M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z'],
    },
    {
        value: 'system',
        label: '跟随系统',
        paths: [
            'M3 5.5h18v10H3z',
            'M8 19.5h8M12 15.5v4',
        ],
    },
]

const sizeClass = computed(() => {
    const map: Record<DpSize, string> = {
        small: 'h-7 px-2 text-[11px] gap-1',
        medium: 'h-8 px-2.5 text-xs gap-1.5',
        large: 'h-9 px-3 text-sm gap-2',
    }
    return map[s.value.size]
})

const selected = computed(() => controller.mode.value)

function select(mode: DpThemeMode) {
    controller.setMode(mode)
}

function handleKeydown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const index = OPTIONS.findIndex((option) => option.value === selected.value)
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const next = OPTIONS[(index + direction + OPTIONS.length) % OPTIONS.length]
    if (next) select(next.value)
}
</script>

<template>
    <div v-bind="rootAttrs" class="dp-theme-switch inline-flex items-center gap-[2px] rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface-2)] p-[3px]"
        role="radiogroup" aria-label="主题模式" @keydown="handleKeydown">
        <button v-for="option in OPTIONS" :key="option.value" type="button" role="radio"
            :aria-checked="selected === option.value" :aria-label="option.label" :title="option.label"
            class="dp-theme-switch__item inline-flex cursor-pointer items-center justify-center rounded-[var(--dp-radius-sm)] border-0 bg-transparent font-medium transition-[background-color,color,box-shadow] duration-[140ms] focus-visible:outline-none focus-visible:shadow-[var(--dp-ring)]"
            :class="[
                sizeClass,
                selected === option.value
                    ? 'bg-[var(--dp-color-surface)] text-[var(--dp-color-fg)] shadow-[var(--dp-shadow-1)]'
                    : 'text-[var(--dp-color-muted)] hover:text-[var(--dp-color-fg)]',
            ]" @click="select(option.value)">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path v-for="(path, index) in option.paths" :key="index" :d="path" />
            </svg>
            <span v-if="c.showLabels">{{ option.label }}</span>
        </button>
    </div>
</template>
