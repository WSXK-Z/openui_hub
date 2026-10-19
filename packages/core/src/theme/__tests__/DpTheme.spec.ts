import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { DpConfigProvider } from '../../components/config'
import { DpThemeSwitch, DpThemeToggle, useThemeController } from '..'

function stubSystemDark(matches: boolean) {
  window.matchMedia = (() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
}

describe('DpConfigProvider theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-dp-theme')
    stubSystemDark(false)
  })

  it('renders the resolved theme on its root and provides the controller', () => {
    let isDark: boolean | undefined
    const Consumer = defineComponent({
      setup() {
        const controller = useThemeController()
        isDark = controller.isDark.value
        return () => h('span', controller.mode.value)
      },
    })

    const wrapper = mount(DpConfigProvider, {
      props: { comp: { mode: 'dark', persist: false } },
      slots: { default: () => h(Consumer) },
    })

    expect(wrapper.find('[data-dp-theme]').attributes('data-dp-theme')).toBe('dark')
    expect(wrapper.text()).toBe('dark')
    expect(isDark).toBe(true)
  })

  it('emits change when the provided controller switches mode', async () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { mode: 'light', persist: false } },
      slots: { default: () => h(DpThemeToggle) },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('change')?.slice(-1)[0]).toEqual(['dark', 'dark'])
    expect(wrapper.find('[data-dp-theme]').attributes('data-dp-theme')).toBe('dark')
  })

  it('follows the system preference in system mode', () => {
    stubSystemDark(true)
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { mode: 'system', persist: false } },
      slots: { default: () => h('div', { class: 'inner' }, 'content') },
    })
    expect(wrapper.find('[data-dp-theme]').attributes('data-dp-theme')).toBe('dark')
  })

  it('applies the resolved theme to the document and restores it on unmount', () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { mode: 'dark', persist: false, applyTo: 'document' } },
    })
    expect(document.documentElement.getAttribute('data-dp-theme')).toBe('dark')

    wrapper.unmount()
    expect(document.documentElement.getAttribute('data-dp-theme')).toBeNull()
  })

  it('applies theme overrides as CSS variables', () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { themeOverrides: { 'color-primary': '#123456', radius: '4px' } } },
      slots: { default: () => h('div', { class: 'inner' }, 'content') },
    })
    const style = wrapper.find('[data-dp-theme]').attributes('style') ?? ''
    expect(style).toContain('--dp-color-primary: #123456')
    expect(style).toContain('--dp-radius: 4px')
  })
})

describe('DpThemeSwitch', () => {
  beforeEach(() => {
    localStorage.clear()
    stubSystemDark(false)
  })

  it('renders the three modes and switches on click', async () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { mode: 'light', persist: false } },
      slots: { default: () => h(DpThemeSwitch) },
    })

    const options = wrapper.findAll('[role="radio"]')
    expect(options).toHaveLength(3)
    expect(options[0]?.attributes('aria-checked')).toBe('true')

    await options[1]?.trigger('click')
    expect(wrapper.find('[data-dp-theme]').attributes('data-dp-theme')).toBe('dark')
    expect(wrapper.emitted('change')?.slice(-1)[0]).toEqual(['dark', 'dark'])
  })

  it('hides labels when showLabels is false', () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { persist: false } },
      slots: { default: () => h(DpThemeSwitch, { comp: { showLabels: false } }) },
    })
    expect(wrapper.find('.dp-theme-switch').text()).toBe('')
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(3)
  })
})

describe('DpThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    stubSystemDark(false)
  })

  it('toggles between light and dark', async () => {
    const wrapper = mount(DpConfigProvider, {
      props: { comp: { mode: 'light', persist: false } },
      slots: { default: () => h(DpThemeToggle) },
    })

    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBe('切换到深色主题')

    await button.trigger('click')
    expect(wrapper.find('[data-dp-theme]').attributes('data-dp-theme')).toBe('dark')
    expect(button.attributes('aria-label')).toBe('切换到浅色主题')

    await button.trigger('click')
    expect(wrapper.find('[data-dp-theme]').attributes('data-dp-theme')).toBe('light')
  })
})
