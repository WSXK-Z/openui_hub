import { inject, type App, type InjectionKey } from 'vue'
import type { DpThemeDefinition } from './themeContext'
import type { DpThemeOverrides } from './themeOverrides'
import { DP_THEME_STORAGE_KEY, type DpThemeMode } from './themeMode'

/**
 * 主题全局配置（纯数据参数）。
 *
 * 通过 `app.use(DpUi, { themes, defaultTheme, ... })` 或 `provideDpThemeConfig` 注入，
 * `DpConfigProvider` / `DpThemeProvider` 与 `useTheme()` 读取它作为默认值，组件上的 `comp` 优先。
 */
export interface DpThemeConfig {
  /** 托管的命名主题：名称 → 定义 */
  themes?: Record<string, DpThemeDefinition>
  /** 初始主题名 */
  theme?: string
  /** 默认主题名；不存在时取第一个主题 */
  defaultTheme?: string
  /** 叠加在所有主题之上的令牌覆盖 */
  themeOverrides?: DpThemeOverrides
  /** 显式主题模式；空字符串表示使用持久化值或主题定义 */
  mode?: DpThemeMode | ''
  /** 没有显式模式与持久化值时使用的模式 */
  defaultMode?: DpThemeMode
  /** 是否把模式写入 localStorage */
  persist?: boolean
  /** localStorage 键名 */
  storageKey?: string
  /** 应用到子树或 document.documentElement（Portal 浮层需要） */
  applyTo?: 'self' | 'document'
}

/** 合并全局配置与组件 comp 后，主题宿主实际使用的完整参数 */
export interface DpThemeHostComp {
  themes: Record<string, DpThemeDefinition>
  theme: string
  defaultTheme: string
  themeOverrides: DpThemeOverrides
  mode: DpThemeMode | ''
  defaultMode: DpThemeMode
  persist: boolean
  storageKey: string
  applyTo: 'self' | 'document'
}

/** 未配置全局参数、组件也未传 comp 时使用的内置默认值 */
export const dpThemeHostDefaults: DpThemeHostComp = {
  themes: { default: {} },
  theme: '',
  defaultTheme: 'default',
  themeOverrides: {},
  mode: '',
  defaultMode: 'system',
  persist: true,
  storageKey: DP_THEME_STORAGE_KEY,
  applyTo: 'self',
}

export const dpThemeConfigKey: InjectionKey<DpThemeConfig> = Symbol('dp-theme-config')

let globalThemeConfig: DpThemeConfig = {}

/** 设置模块级全局主题配置（`app.use(DpUi, options)` 内部调用） */
export function setGlobalThemeConfig(config: DpThemeConfig = {}) {
  globalThemeConfig = { ...config }
}

/** 读取模块级全局主题配置 */
export function getGlobalThemeConfig(): DpThemeConfig {
  return globalThemeConfig
}

/** 把主题配置注入到 app 并记为全局默认值 */
export function provideDpThemeConfig(app: App, config: DpThemeConfig = {}) {
  setGlobalThemeConfig(config)
  app.provide(dpThemeConfigKey, config)
}

/** 读取当前 app 注入的主题配置；没有注入时使用模块级全局配置 */
export function useDpThemeConfig(): DpThemeConfig {
  return inject(dpThemeConfigKey, null) ?? globalThemeConfig
}

/**
 * 合并主题配置与组件 `comp`（`comp` 优先），返回宿主需要的完整参数。
 * `themes` 为空时回退内置的 `{ default: {} }`，保证始终存在可用主题。
 */
export function resolveThemeHostComp(
  comp: Partial<DpThemeHostComp> | undefined,
  config: DpThemeConfig = globalThemeConfig,
): DpThemeHostComp {
  const merged = { ...dpThemeHostDefaults, ...config, ...comp } as DpThemeHostComp
  if (!merged.themes || Object.keys(merged.themes).length === 0) {
    merged.themes = dpThemeHostDefaults.themes
  }
  return merged
}
