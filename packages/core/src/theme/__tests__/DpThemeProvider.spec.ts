import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import DpThemeProvider from '../DpThemeProvider.vue'
import { useTheme } from '..'

function stubSystemDark(matches: boolean) {
  window.matchMedia = (() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
}

const Consumer = defineComponent({
  setup() {
    const theme = useTheme()
    return () =>
      h('div', { class: 'consumer' }, [
        h('span', { class: 'name' }, theme.theme.value),
        h('span', { class: 'names' }, theme.themeNames.value.join(',')),
        h('button', { type: 'button', onClick: () => theme.setTheme('violet') }, 'switch'),
      ])
  },
})

function mountProvider(comp: Record<string, unknown>) {
  return mount(DpThemeProvider, {
    props: { comp: { persist: false, ...comp } },
    slots: { default: () => h(Consumer) },
  })
}

describe('DpThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-dp-theme')
    stubSystemDark(false)
  })

  it('does not wrap slot content in an extra element by default', () => {
    const wrapper = mountProvider({
      themes: { default: { overrides: { 'color-accent': '#111111' } } },
    })

    expect(wrapper.find('.dp-theme-provider').exists()).toBe(false)
    const consumer = wrapper.find('.consumer')
    expect(consumer.attributes('data-dp-theme')).toBe('light')
    expect(consumer.attributes('style')).toContain('--dp-color-accent: #111111')
  })

  it('hosts multiple themes and switches the active one', async () => {
    const wrapper = mountProvider({
      themes: {
        default: { overrides: { 'color-accent': '#111111' } },
        violet: { overrides: { 'color-accent': '#222222' } },
      },
      theme: 'default',
    })

    expect(wrapper.find('.name').text()).toBe('default')
    expect(wrapper.find('.names').text()).toBe('default,violet')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.consumer').attributes('style')).toContain('--dp-color-accent: #222222')
    expect(wrapper.find('.name').text()).toBe('violet')
    expect(wrapper.emitted('change')?.slice(-1)[0]).toEqual(['violet', 'system', 'light'])
  })

  it('falls back to the first theme when defaultTheme is missing', () => {
    const wrapper = mountProvider({
      themes: {
        ocean: { overrides: { radius: '2px' } },
        sunset: { overrides: { radius: '8px' } },
      },
      defaultTheme: 'missing',
    })

    expect(wrapper.find('.name').text()).toBe('ocean')
    expect(wrapper.find('.consumer').attributes('style')).toContain('--dp-radius: 2px')
  })

  it('applies the mode declared by the active theme', () => {
    const wrapper = mountProvider({
      themes: { night: { mode: 'dark' } },
      defaultTheme: 'night',
    })
    expect(wrapper.find('.consumer').attributes('data-dp-theme')).toBe('dark')
  })

  it('applies the CSS class declared by the active theme', async () => {
    const wrapper = mountProvider({
      themes: {
        ocean: { className: 'theme-ocean' },
        violet: { className: 'theme-violet' },
      },
      defaultTheme: 'ocean',
    })

    expect(wrapper.find('.consumer').classes()).toContain('theme-ocean')
    expect(wrapper.find('.consumer').classes()).not.toContain('theme-violet')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.consumer').classes()).toContain('theme-violet')
    expect(wrapper.find('.consumer').classes()).not.toContain('theme-ocean')
  })

  it('follows a controlled theme prop', async () => {
    const themes = {
      light: { overrides: { radius: '2px' } },
      dark: { overrides: { radius: '6px' } },
    }
    const wrapper = mountProvider({ themes, theme: 'light' })
    expect(wrapper.find('.name').text()).toBe('light')

    await wrapper.setProps({ comp: { persist: false, themes, theme: 'dark' } })
    expect(wrapper.find('.name').text()).toBe('dark')
    expect(wrapper.find('.consumer').attributes('style')).toContain('--dp-radius: 6px')
  })
})
