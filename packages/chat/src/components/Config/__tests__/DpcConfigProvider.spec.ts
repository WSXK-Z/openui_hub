import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcConfigProvider from '../DpcConfigProvider.vue'

describe('DpcConfigProvider', () => {
  it('sets data-dpc-theme from theme model', () => {
    const wrapper = mount(DpcConfigProvider, { props: { theme: 'dark' } })
    expect(wrapper.find('.dpc-config-provider').attributes('data-dpc-theme')).toBe('dark')
  })

  it('applies themeOverrides as --dpc-* css vars', () => {
    const wrapper = mount(DpcConfigProvider, {
      props: { comp: { themeOverrides: { 'color-primary': '#7c3aed' } } },
    })
    const style = wrapper.find('.dpc-config-provider').attributes('style') ?? ''
    expect(style).toContain('--dpc-color-primary')
    expect(style).toContain('#7c3aed')
  })

  it('renders slot content', () => {
    const wrapper = mount(DpcConfigProvider, {
      props: { theme: 'light' },
      slots: { default: 'hello' },
    })
    expect(wrapper.text()).toContain('hello')
  })
})
