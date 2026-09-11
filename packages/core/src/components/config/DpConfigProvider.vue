<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'
import { provideThemeContext } from './themeContext'

defineOptions({ name: 'DpConfigProvider', inheritAttrs: false })

export interface DpConfigProviderComp {
    /**
     * 组件级令牌覆盖，键去掉 `--dp-` 前缀。
     * 例：`{ 'color-primary': '#7c3aed', radius: '10px' }` → `--dp-color-primary` / `--dp-radius`。
     */
    themeOverrides: Record<string, string | number>
}

export type DpConfigProviderProps = DpProps<DpConfigProviderComp>

const props = defineProps<DpConfigProviderProps>()

const { comp: c, rootAttrs } = useDpProps<DpConfigProviderComp>(props, {
    compDefaults: { themeOverrides: {} },
})

provideThemeContext({ themeOverrides: c.value.themeOverrides })

const vars = computed(() => {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(c.value.themeOverrides ?? {})) {
        result[`--dp-${key}`] = String(value)
    }
    return result
})
</script>

<template>
    <div v-bind="rootAttrs" class="dp-config-provider contents" :style="vars">
        <slot />
    </div>
</template>
