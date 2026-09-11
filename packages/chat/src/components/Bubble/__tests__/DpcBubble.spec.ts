import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcBubble from '../DpcBubble.vue'

describe('DpcBubble', () => {
  it('renders content text', () => {
    const wrapper = mount(DpcBubble, { props: { comp: { content: '你好' } } })
    expect(wrapper.text()).toContain('你好')
  })

  it('aligns user message to the right', () => {
    const wrapper = mount(DpcBubble, { props: { comp: { role: 'user', content: 'hi' } } })
    expect(wrapper.classes()).toContain('justify-end')
  })

  it('shows typing dots while loading', () => {
    const wrapper = mount(DpcBubble, {
      props: { comp: { content: '', loading: true } },
    })
    expect(wrapper.findAll('.dpc-bubble-loading__dot')).toHaveLength(3)
  })

  it('merges theme cssVars into root', () => {
    const wrapper = mount(DpcBubble, {
      props: { theme: { cssVars: { 'color-primary': '#7c3aed' } } },
    })
    expect(wrapper.attributes('style')).toContain('--dpc-color-primary')
    expect(wrapper.attributes('style')).toContain('#7c3aed')
  })
})
