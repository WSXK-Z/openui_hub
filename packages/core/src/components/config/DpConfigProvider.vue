<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'
import { useThemeHost } from '../../theme/useThemeHost'
import { useScope } from '../../composables/useScope.ts'
import type { DpThemeHostComp } from '../../theme/themeConfig'
import type { DpResolvedTheme, DpThemeMode } from '../../theme/themeMode'

defineOptions({ name: 'DpConfigProvider', inheritAttrs: false })

/**
 * 全局配置参数（纯数据）：主题、令牌覆盖与模式配置。
 * 缺省值来自 `app.use(DpUi, options)` 的全局配置，这里的 `comp` 优先。
 */
export type DpConfigProviderComp = DpThemeHostComp

export type DpConfigProviderProps = DpProps<DpConfigProviderComp>

const emit = defineEmits<{
    (e: 'change', mode: DpThemeMode, resolved: DpResolvedTheme): void
}>()

const props = defineProps<DpConfigProviderProps>()

const { rootAttrs } = useDpProps<DpConfigProviderComp>(props)

const { scopeAttrs } = useThemeHost({
    comp: computed(() => props.comp),
    rootAttrs,
    onChange: (_theme, mode, resolved) => emit('change', mode, resolved),
})

const ThemeScope = useScope('DpConfigProviderScope')
</script>

<template>
    <ThemeScope :scope-attrs="scopeAttrs">
        <slot />
    </ThemeScope>
</template>
