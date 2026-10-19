import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { StyleValue } from 'vue'
import { provideThemeContext, type DpThemeDefinition } from './themeContext'
import { createThemeController, type DpResolvedTheme, type DpThemeMode } from './themeMode'
import type { DpThemeOverrides } from './themeOverrides'
import {
  resolveThemeHostComp,
  useDpThemeConfig,
  type DpThemeHostComp,
} from './themeConfig'

export interface UseThemeHostOptions {
  /** 组件上的原始 comp（未合并默认值），全局配置作为其回退 */
  comp: ComputedRef<Partial<DpThemeHostComp> | undefined>
  /** 组件根属性（透传的 class / style 等） */
  rootAttrs: ComputedRef<Record<string, unknown>>
  /** 主题或模式变化时回调 */
  onChange?: (theme: string, mode: DpThemeMode, resolved: DpResolvedTheme) => void
}

export interface DpThemeHost {
  /** 合并全局配置后的完整参数 */
  config: ComputedRef<DpThemeHostComp>
  /** 当前主题名 */
  activeTheme: Ref<string>
  /** 全部托管主题 */
  themes: ComputedRef<Record<string, DpThemeDefinition>>
  /** 全部主题名 */
  themeNames: ComputedRef<string[]>
  /** 切换主题 */
  setTheme: (theme: string) => void
  /** 需要合并到插槽根节点的主题属性 */
  scopeAttrs: ComputedRef<Record<string, unknown>>
}

function resolveInitialTheme(config: DpThemeHostComp): string {
  if (config.theme && config.themes[config.theme]) return config.theme
  if (config.defaultTheme && config.themes[config.defaultTheme]) return config.defaultTheme
  return Object.keys(config.themes)[0] ?? ''
}

/**
 * 主题宿主的共享逻辑：解析配置、创建控制器、提供上下文、计算根节点属性。
 *
 * 一个组件调用一次；调用方负责用 `useThemeScope` 渲染插槽并把 `scopeAttrs` 合并到根节点。
 */
export function useThemeHost(options: UseThemeHostOptions): DpThemeHost {
  const injectedConfig = useDpThemeConfig()
  const config = computed(() => resolveThemeHostComp(options.comp.value, injectedConfig))

  const activeTheme = ref(resolveInitialTheme(config.value))
  const themes = computed(() => config.value.themes)
  const themeNames = computed(() => Object.keys(config.value.themes))
  const activeDefinition = computed(() => config.value.themes[activeTheme.value])
  const mergedOverrides = computed<DpThemeOverrides>(() => ({
    ...activeDefinition.value?.overrides,
    ...config.value.themeOverrides,
  }))

  const controller = createThemeController({
    mode: config.value.mode || activeDefinition.value?.mode || '',
    defaultMode: config.value.defaultMode,
    persist: config.value.persist,
    storageKey: config.value.storageKey,
    applyToDocument: config.value.applyTo === 'document',
  })

  function setTheme(theme: string) {
    if (theme && !config.value.themes[theme]) return
    activeTheme.value = theme
  }

  provideThemeContext({
    get themeOverrides() {
      return mergedOverrides.value
    },
    theme: activeTheme,
    themes,
    themeNames,
    setTheme,
    themeMode: controller,
    mode: controller.mode,
    resolvedMode: controller.resolvedMode,
    isDark: controller.isDark,
    setMode: controller.setMode,
    toggleMode: controller.toggleMode,
  })

  watch(
    () => config.value.theme,
    (theme) => {
      if (theme) setTheme(theme)
    },
  )

  watch(
    () => config.value.themes,
    (next) => {
      if (activeTheme.value && next[activeTheme.value]) return
      activeTheme.value = resolveInitialTheme(config.value)
    },
    { deep: true },
  )

  watch(
    () => config.value.mode,
    (mode) => {
      if (mode) controller.setMode(mode)
    },
  )

  watch(activeTheme, (theme) => {
    const definition = config.value.themes[theme]
    if (definition?.mode) controller.setMode(definition.mode)
    options.onChange?.(theme, controller.mode.value, controller.resolvedMode.value)
  })

  watch(controller.mode, (mode) => {
    options.onChange?.(activeTheme.value, mode, controller.resolvedMode.value)
  })

  /** 令牌与主题属性直接合并到插槽根节点，DOM 层级与 Provider 外一致 */
  const scopeAttrs = computed<Record<string, unknown>>(() => {
    const { class: attrClass, ...rest } = options.rootAttrs.value
    const themeClass = activeDefinition.value?.className ?? ''
    const classes = [attrClass, themeClass].filter(
      (item) => item !== undefined && item !== null && item !== '',
    )
    const vars: Record<string, string> = {}
    for (const [key, value] of Object.entries(mergedOverrides.value)) {
      vars[`--dp-${key}`] = String(value)
    }
    return {
      ...rest,
      ...(classes.length > 0 ? { class: classes } : {}),
      'data-dp-theme': controller.resolvedMode.value,
      style: [
        options.rootAttrs.value.style,
        vars,
        { colorScheme: controller.resolvedMode.value },
      ] as StyleValue[],
    }
  })

  return { config, activeTheme, themes, themeNames, setTheme, scopeAttrs }
}
