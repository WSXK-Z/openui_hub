import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { DpConfigProvider } from '../../components/config'
import {
  dpThemeHostDefaults,
  getGlobalThemeConfig,
  provideDpThemeConfig,
  resolveThemeHostComp,
  setGlobalThemeConfig,
  useDpThemeConfig,
} from '../themeConfig'

function stubSystemDark(matches: boolean) {
  window.matchMedia = (() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
}

/** 用插件安装的方式注入全局主题配置，等价于 app.use(DpUi, options) */
function globalConfigPlugin(config: Parameters<typeof provideDpThemeConfig>[1]) {
  return {
    install(app: Parameters<typeof provideDpThemeConfig>[0]) {
      provideDpThemeConfig(app, config)
    },
  }
}

describe('resolveThemeHostComp', () => {
  beforeEach(() => {
    setGlobalThemeConfig({})
  })

  it('falls back to built-in defaults', () => {
    expect(resolveThemeHostComp(undefined)).toEqual(dpThemeHostDefaults)
  })

  it('prefers comp over global config over defaults', () => {
    const config = { defaultTheme: 'ocean', mode: 'dark' as const, persist: false }
    const resolved = resolveThemeHostComp({ defaultTheme: 'rose' }, config)

    expect(resolved.defaultTheme).toBe('rose')
    expect(resolved.mode).toBe('dark')
    expect(resolved.persist).toBe(false)
    expect(resolved.storageKey).toBe(dpThemeHostDefaults.storageKey)
  })

  it('falls back to the default theme map when themes are empty', () => {
    expect(resolveThemeHostComp({ themes: {} }).themes).toEqual({ default: {} })
  })

  it('reads and writes the module-level config', () => {
    setGlobalThemeConfig({ defaultTheme: 'ocean' })
    expect(getGlobalThemeConfig().defaultTheme).toBe('ocean')
  })
})

describe('全局主题配置注入', () => {
  beforeEach(() => {
    localStorage.clear()
    setGlobalThemeConfig({})
    stubSystemDark(false)
  })

  it('DpConfigProvider 使用插件注入的主题数据', () => {
    const wrapper = mount(DpConfigProvider, {
      global: {
        plugins: [
          globalConfigPlugin({
            themes: {
              ocean: { overrides: { 'color-accent': '#0284c7' } },
              rose: { overrides: { 'color-accent': '#e11d48' } },
            },
            defaultTheme: 'rose',
          }),
        ],
      },
      slots: { default: () => h('div', { class: 'inner' }) },
    })

    const inner = wrapper.find('.inner')
    expect(inner.attributes('style')).toContain('--dp-color-accent: #e11d48')
  })

  it('组件 comp 覆盖全局配置', () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { defaultTheme: 'ocean' } },
      global: {
        plugins: [
          globalConfigPlugin({
            themes: {
              ocean: { overrides: { 'color-accent': '#0284c7' } },
              rose: { overrides: { 'color-accent': '#e11d48' } },
            },
            defaultTheme: 'rose',
          }),
        ],
      },
      slots: { default: () => h('div', { class: 'inner' }) },
    })

    expect(wrapper.find('.inner').attributes('style')).toContain('--dp-color-accent: #0284c7')
  })

  it('通过 useDpThemeConfig 读取注入的配置', () => {
    let captured: Record<string, unknown> | undefined
    const Consumer = defineComponent({
      setup() {
        captured = useDpThemeConfig() as Record<string, unknown>
        return () => h('div')
      },
    })

    mount(Consumer, {
      global: { plugins: [globalConfigPlugin({ defaultTheme: 'ocean', persist: false })] },
    })

    expect(captured?.defaultTheme).toBe('ocean')
    expect(captured?.persist).toBe(false)
  })
})
