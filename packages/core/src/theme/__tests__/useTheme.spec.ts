import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, reactive, type Component } from 'vue'
import { DpConfigProvider } from '../../components/config'
import { useTheme, type DpThemeOptions } from '..'

function stubSystemDark(matches: boolean) {
  window.matchMedia = (() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
}

const ModeConsumer = defineComponent({
  setup() {
    const theme = useTheme()
    return () => h('span', { class: 'mode' }, theme.resolvedMode.value)
  },
})

function defineScope(options: DpThemeOptions) {
  return defineComponent({
    setup() {
      useTheme(options)
      return () => h('div', { class: 'scope' }, [h(ModeConsumer)])
    },
  })
}

function mountWithProvider(scope: Component) {
  return mount(DpConfigProvider, {
    props: { comp: { mode: 'dark', persist: false } },
    slots: { default: () => h(scope) },
  })
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-dp-theme')
    stubSystemDark(false)
  })

  it('applies overrides to the current component root', () => {
    const Scope = defineScope({
      themeOverrides: { 'color-primary': '#123456', radius: '4px' },
    })
    const wrapper = mountWithProvider(Scope)
    const scope = wrapper.find('.scope')

    expect(scope.attributes('style')).toContain('--dp-color-primary: #123456')
    expect(scope.attributes('style')).toContain('--dp-radius: 4px')
    expect(wrapper.find('.mode').text()).toBe('dark')
  })

  it('merges overrides on top of the provider theme', () => {
    const Scope = defineScope({ themeOverrides: { 'color-primary': '#abcdef' } })
    const wrapper = mountWithProvider(Scope)

    expect(wrapper.find('.scope').attributes('style')).toContain('--dp-color-primary: #abcdef')
    expect(wrapper.find('.mode').text()).toBe('dark')
  })

  it('follows reactive option changes', async () => {
    const options = reactive<DpThemeOptions>({ themeOverrides: { 'color-primary': '#111111' } })
    const wrapper = mountWithProvider(
      defineComponent({
        setup() {
          useTheme(options)
          return () => h('div', { class: 'scope' }, [h(ModeConsumer)])
        },
      }),
    )
    const scope = wrapper.find('.scope')
    expect(scope.attributes('style')).toContain('--dp-color-primary: #111111')

    options.themeOverrides = { 'color-primary': '#222222' }
    await nextTick()
    expect(scope.attributes('style')).toContain('--dp-color-primary: #222222')
  })

  it('removes the injected variables from the root on unmount', () => {
    const Scope = defineScope({ themeOverrides: { radius: '4px' } })
    const wrapper = mountWithProvider(Scope)
    const root = wrapper.find('.scope').element as HTMLElement

    expect(root.style.getPropertyValue('--dp-radius')).toBe('4px')
    wrapper.unmount()

    expect(root.style.getPropertyValue('--dp-radius')).toBe('')
  })

  it('throws when used outside DpThemeProvider', () => {
    const Unscoped = defineComponent({
      setup() {
        useTheme()
        return () => h('div')
      },
    })
    expect(() => mount(Unscoped)).toThrow(/DpThemeProvider/)
  })

  it('requires a component setup when options are provided', () => {
    expect(() => useTheme({ themeOverrides: { radius: '4px' } })).toThrow()
  })
})
