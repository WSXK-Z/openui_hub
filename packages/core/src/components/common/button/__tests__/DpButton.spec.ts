import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpButton from '../DpButton.vue'

describe('DpButton', () => {
  it('renders slot content and primary variant class', () => {
    const wrapper = mount(DpButton, {
      props: { theme: { variant: 'primary' } },
      slots: { default: '提交' },
    })
    expect(wrapper.text()).toContain('提交')
    expect(wrapper.classes()).toContain('dp-button--primary')
  })

  it('emits click when enabled', async () => {
    const wrapper = mount(DpButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled via comp', async () => {
    const wrapper = mount(DpButton, { props: { comp: { disabled: true } } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('renders loading spinner and disables interaction via comp', async () => {
    const wrapper = mount(DpButton, { props: { comp: { loading: true } } })
    expect(wrapper.find('.dp-button__spinner').exists()).toBe(true)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('merges theme cssVars into root', () => {
    const wrapper = mount(DpButton, {
      props: { theme: { cssVars: { 'color-primary': '#7c3aed' } } },
    })
    expect(wrapper.attributes('style')).toContain('--dp-color-primary')
    expect(wrapper.attributes('style')).toContain('#7c3aed')
  })
})
