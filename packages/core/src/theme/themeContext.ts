import {
  Comment,
  Fragment,
  Text,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  provide,
  watch,
  type ComponentInternalInstance,
  type ComputedRef,
  type InjectionKey,
  type Ref,
  type VNode,
} from 'vue'
import type { DpResolvedTheme, DpThemeMode, DpThemeController } from './themeMode'
import type { DpThemeOverrides } from './themeOverrides'

/** 主题定义：DpThemeProvider 托管的一个命名主题 */
export interface DpThemeDefinition {
  /** 该主题的令牌覆盖，键省略 `--dp-` 前缀（IDE 提示内置令牌键） */
  overrides?: DpThemeOverrides
  /**
   * 该主题对应的 CSS 类名，类中直接书写 `--dp-*` 变量。
   * 在 `<style>` 块里写令牌可获得完整 CSS 补全与颜色预览。
   */
  className?: string
  /** 激活该主题时切换到的模式 */
  mode?: DpThemeMode
}

export interface ThemeContext {
  /** 当前生效的令牌覆盖（主题定义 + 上层覆盖） */
  themeOverrides: DpThemeOverrides
  /** 当前主题名 */
  theme: Ref<string>
  /** 所有已托管主题 */
  themes: Ref<Record<string, DpThemeDefinition>>
  /** 所有主题名 */
  themeNames: ComputedRef<string[]>
  /** 切换到指定主题 */
  setTheme: (theme: string) => void
  /** 主题控制器（模式、系统跟随、持久化） */
  themeMode: DpThemeController
  mode: Ref<DpThemeMode>
  resolvedMode: ComputedRef<DpResolvedTheme>
  isDark: ComputedRef<boolean>
  setMode: (mode: DpThemeMode) => void
  toggleMode: () => void
}

/** useTheme(options) 的函数式主题作用域配置 */
export interface DpThemeOptions {
  /** 令牌覆盖，键省略 `--dp-` 前缀；叠加在当前主题之上，生效范围为本组件子树 */
  themeOverrides?: DpThemeOverrides
}

type ThemeElement = HTMLElement | SVGElement

interface AppliedTheme {
  vars: Set<string>
  theme: string | null
  colorScheme: string
}

export const themeContextKey: InjectionKey<ThemeContext> = Symbol('dp-theme')

/** 组件实例 → 该实例通过 useTheme(options) 创建的函数式作用域 */
const themeScopes = new WeakMap<ComponentInternalInstance, ThemeContext>()

export function provideThemeContext(context: ThemeContext) {
  provide(themeContextKey, context)
}

/**
 * 读取或创建主题作用域。
 *
 * - 必须在 `DpThemeProvider`（或内部使用它的 `DpConfigProvider`）内调用。
 * - 无参数：读取最近的主题上下文。
 * - 传参数：在当前组件创建函数式作用域，把令牌覆盖写入本组件根元素，作用于该组件子树。
 *
 * 主题（名称）与模式（浅色 / 深色 / 跟随系统）由 `DpThemeProvider` 统一托管，
 * 函数式作用域只追加令牌覆盖，不新建模式状态。
 */
export function useTheme(options: DpThemeOptions): ThemeContext
export function useTheme(): ThemeContext
export function useTheme(options?: DpThemeOptions): ThemeContext {
  const instance = getCurrentInstance()
  const injected = inject(themeContextKey, null)
  if (!injected) {
    throw new Error('[dp-ui] useTheme 必须在 DpThemeProvider（或 DpConfigProvider）内使用')
  }

  if (options) {
    if (!instance) {
      throw new Error('[dp-ui] useTheme(options) 必须在组件 setup 中调用')
    }
    const existing = themeScopes.get(instance)
    if (existing) return existing

    const context = createThemeScope(instance, options, injected)
    themeScopes.set(instance, context)
    return context
  }

  return (instance && themeScopes.get(instance)) ?? injected
}

/** 读取最近作用域的主题控制器（必须位于 DpThemeProvider 内） */
export function useThemeController(): DpThemeController {
  return useTheme().themeMode
}

function createThemeScope(
  instance: ComponentInternalInstance,
  options: DpThemeOptions,
  parent: ThemeContext,
): ThemeContext {
  const controller = parent.themeMode

  const context: ThemeContext = {
    get themeOverrides() {
      return { ...parent.themeOverrides, ...options.themeOverrides }
    },
    theme: parent.theme,
    themes: parent.themes,
    themeNames: parent.themeNames,
    setTheme: parent.setTheme,
    themeMode: controller,
    mode: controller.mode,
    resolvedMode: controller.resolvedMode,
    isDark: controller.isDark,
    setMode: controller.setMode,
    toggleMode: controller.toggleMode,
  }

  provideThemeContext(context)
  bindThemeScope(instance, controller, () => options.themeOverrides ?? {})
  return context
}

/** 把作用域主题写到组件根元素，渲染期间根节点变化时重新同步 */
function bindThemeScope(
  instance: ComponentInternalInstance,
  controller: DpThemeController,
  readOverrides: () => DpThemeOverrides,
) {
  const applied = new Map<ThemeElement, AppliedTheme>()
  let stopped = false

  function apply() {
    if (stopped) return

    const targets = new Set(collectThemeElements(instance))
    for (const element of applied.keys()) {
      if (!targets.has(element)) applied.delete(element)
    }

    const vars = normalizeOverrides(readOverrides())
    const theme = controller.resolvedMode.value

    for (const element of targets) {
      let state = applied.get(element)
      if (!state) {
        state = {
          vars: new Set(),
          theme: element.getAttribute('data-dp-theme'),
          colorScheme: element.style.colorScheme,
        }
        applied.set(element, state)
      }

      for (const key of state.vars) {
        if (!vars.has(key)) element.style.removeProperty(key)
      }
      for (const [key, value] of vars) element.style.setProperty(key, value)
      state.vars = new Set(vars.keys())

      element.setAttribute('data-dp-theme', theme)
      element.style.colorScheme = theme
    }
  }

  function restore() {
    if (stopped) return
    stopped = true
    for (const [element, state] of applied) {
      for (const key of state.vars) element.style.removeProperty(key)
      if (state.theme === null) element.removeAttribute('data-dp-theme')
      else element.setAttribute('data-dp-theme', state.theme)
      element.style.colorScheme = state.colorScheme
    }
    applied.clear()
  }

  onMounted(apply)
  onUpdated(apply)
  watch(controller.resolvedMode, apply)
  watch(readOverrides, apply, { deep: true })
  onBeforeUnmount(restore)
}

function normalizeOverrides(overrides: DpThemeOverrides): Map<string, string> {
  const result = new Map<string, string>()
  for (const [key, value] of Object.entries(overrides)) {
    result.set(key.startsWith('--') ? key : `--dp-${key}`, String(value))
  }
  return result
}

/** 收集组件根节点（支持多根 Fragment 与根节点为组件的情况） */
function collectThemeElements(instance: ComponentInternalInstance): ThemeElement[] {
  const elements: ThemeElement[] = []
  const walk = (node: unknown) => {
    if (!node) return
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }

    const vnode = node as VNode
    if (vnode.type === Fragment) {
      walk(vnode.children)
      return
    }
    if (vnode.type === Comment || vnode.type === Text) return
    if (vnode.component) {
      walk(vnode.component.subTree)
      return
    }
    if (isThemeElement(vnode.el)) elements.push(vnode.el)
  }
  walk(instance.subTree)
  return elements
}

function isThemeElement(value: unknown): value is ThemeElement {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return true
  return typeof SVGElement !== 'undefined' && value instanceof SVGElement
}

