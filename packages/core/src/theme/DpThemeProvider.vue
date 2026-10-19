<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps } from '../types'
import { useThemeHost } from './useThemeHost'
import { useScope } from '../composables/useScope.ts'
import type { DpThemeHostComp } from './themeConfig'
import type { DpResolvedTheme, DpThemeMode } from './themeMode'

defineOptions({ name: 'DpThemeProvider', inheritAttrs: false })

/** 主题宿主参数：主题数据 + 模式配置，缺省值可由 `app.use(DpUi, options)` 全局配置提供 */
export type DpThemeProviderComp = DpThemeHostComp

export type DpThemeProviderProps = DpProps<DpThemeProviderComp>

const emit = defineEmits<{
    (e: 'change', theme: string, mode: DpThemeMode, resolved: DpResolvedTheme): void
}>()

const props = defineProps<DpThemeProviderProps>()

const { rootAttrs } = useDpProps<DpThemeProviderComp>(props)

const { scopeAttrs } = useThemeHost({
    comp: computed(() => props.comp),
    rootAttrs,
    onChange: (theme, mode, resolved) => emit('change', theme, mode, resolved),
})

const ThemeScope = useScope('DpThemeProviderScope')
</script>

<template>
    <ThemeScope :scope-attrs="scopeAttrs">
        <slot />
    </ThemeScope>
</template>
