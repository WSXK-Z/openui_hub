<script setup lang="ts">
import { computed, reactive, watchEffect } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'
import type { DpcThemeContext, DpcThemeName } from './themeContext'
import { provideDpcTheme } from './themeContext'

defineOptions({ name: 'DpcConfigProvider', inheritAttrs: false })

export interface DpcConfigProviderComp {
  /** 是否以 display: contents 渲染（作为纯上下文注入层，不占布局） */
  contents: boolean
  /**
   * 组件级令牌覆盖，键去掉 `--dpc-` 前缀。
   * 例：`{ 'color-primary': '#7c3aed', radius: '10px' }` → `--dpc-color-primary` / `--dpc-radius`。
   * 覆盖优先级高于主题（dark/light）变量。
   */
  themeOverrides: Record<string, string | number>
}

export type DpcConfigProviderProps = DpcProps<DpcConfigProviderComp>

const props = defineProps<DpcConfigProviderProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcConfigProviderComp>(props, {
  compDefaults: { contents: false, themeOverrides: {} },
})

const theme = defineModel<DpcThemeName>('theme', { default: 'light' })

// 共享响应式上下文：子组件 useDpcTheme() 可实时读取主题与覆盖
const context = reactive<DpcThemeContext>({ theme: 'light', overrides: {} })
watchEffect(() => {
  context.theme = theme.value
  context.overrides = c.value.themeOverrides ?? {}
})
provideDpcTheme(context)

const vars = computed(() => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(c.value.themeOverrides ?? {})) {
    result[key.startsWith('--') ? key : `--dpc-${key}`] = String(value)
  }
  return result
})
</script>

<template>
  <!-- 主题/令牌容器：设置 data-dpc-theme 触发暗色变量，themeOverrides 写入内联 --dpc-* -->
  <div v-bind="rootAttrs" class="dpc-config-provider" :class="{ contents: c.contents }" :data-dpc-theme="theme"
    :style="vars">
    <slot />
  </div>
</template>
