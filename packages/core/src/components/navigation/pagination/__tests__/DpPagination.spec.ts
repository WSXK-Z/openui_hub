import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpPagination from '../DpPagination.vue'

describe('DpPagination', () => {
  it('renders every page when page count is small', () => {
    const wrapper = mount(DpPagination, {
      props: { comp: { total: 35, pageSize: 10 }, current: 2 },
    })
    const pageButtons = wrapper.findAll('button[aria-current], button').filter((btn) => /^\d+$/.test(btn.text()))
    expect(pageButtons).toHaveLength(4)
    expect(wrapper.text()).not.toContain('…')
  })

  it('collapses large page counts into ellipsis', () => {
    const wrapper = mount(DpPagination, {
      props: { comp: { total: 1000, pageSize: 10, maxVisible: 7 }, current: 50 },
    })
    expect(wrapper.findAll('button[aria-label="向前翻页"]')).toHaveLength(1)
    expect(wrapper.findAll('button[aria-label="向后翻页"]')).toHaveLength(1)
    const labels = wrapper.findAll('button').map((btn) => btn.text())
    expect(labels).toContain('1')
    expect(labels).toContain('100')
    expect(labels).toContain('50')
  })

  it('jumps pages when ellipsis is clicked', async () => {
    const wrapper = mount(DpPagination, {
      props: { comp: { total: 1000, pageSize: 10, maxVisible: 7 }, current: 50 },
    })
    await wrapper.find('button[aria-label="向后翻页"]').trigger('click')
    expect(wrapper.emitted('update:current')?.[0]).toEqual([55])
  })
})
