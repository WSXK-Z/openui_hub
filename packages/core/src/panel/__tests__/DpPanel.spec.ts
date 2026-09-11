import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpPanel from '../DpPanel.vue'

describe('DpPanel', () => {
  it('renders title and default slot', () => {
    const wrapper = mount(DpPanel, {
      props: { comp: { title: '筛选区' } },
      slots: { default: '面板内容' },
    })
    expect(wrapper.text()).toContain('筛选区')
    expect(wrapper.text()).toContain('面板内容')
  })

  it('collapses body when toggled', async () => {
    const wrapper = mount(DpPanel, { props: { comp: { title: '列表', collapsible: true } } })
    const body = wrapper.find('.dp-panel__body')
    expect((body.element as HTMLElement).style.display).toBe('')
    await wrapper.find('.dp-panel__toggle').trigger('click')
    expect((wrapper.find('.dp-panel__body').element as HTMLElement).style.display).toBe('none')
  })
})
