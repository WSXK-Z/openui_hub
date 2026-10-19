import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpTabs from '../DpTabs.vue'

const items = [
  { label: '概览', value: 'overview', content: '概览内容' },
  { label: '配置', value: 'config', content: '配置内容' },
]

describe('DpTabs', () => {
  it('renders segment type by default', () => {
    const wrapper = mount(DpTabs, { props: { comp: { items } } })
    expect(wrapper.classes()).toContain('dp-tabs--segment')
    expect(wrapper.find('.dp-tabs__trigger').classes()).toContain('h-[30px]')
  })

  it('supports line and card types', () => {
    const line = mount(DpTabs, { props: { comp: { items }, theme: { type: 'line' } } })
    expect(line.classes()).toContain('dp-tabs--line')
    expect(line.find('.dp-tabs__trigger').classes()).toContain('h-9')
    expect(line.find('.dp-tabs__trigger').classes()).toContain('border-b-2')

    const card = mount(DpTabs, { props: { comp: { items }, theme: { type: 'card' } } })
    expect(card.classes()).toContain('dp-tabs--card')
    expect(card.find('.dp-tabs__content').classes()).toContain('border')
  })

  it('renders the active tab content', () => {
    const wrapper = mount(DpTabs, { props: { comp: { items } } })
    expect(wrapper.text()).toContain('概览内容')
  })
})
