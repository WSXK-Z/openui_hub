import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpTable from '../DpTable.vue'
import type { DpTableColumn } from '../DpTable.vue'

const columns: DpTableColumn[] = [
  { key: 'name', title: '名称' },
  { key: 'age', title: '年龄', align: 'right' },
]

describe('DpTable', () => {
  it('renders columns and data rows', () => {
    const wrapper = mount(DpTable, {
      props: {
        comp: {
          columns,
          data: [
            { name: '张三', age: 18 },
            { name: '李四', age: 20 },
          ],
        },
      },
    })
    expect(wrapper.text()).toContain('名称')
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('renders empty text when no data', () => {
    const wrapper = mount(DpTable, {
      props: { comp: { columns, data: [], emptyText: '空空如也' } },
    })
    expect(wrapper.text()).toContain('空空如也')
  })

  it('renders custom cell via td-{key} slot', () => {
    const wrapper = mount(DpTable, {
      props: { comp: { columns, data: [{ name: '张三', age: 18 }] } },
      slots: { 'td-name': '<b>高亮</b>' },
    })
    expect(wrapper.find('tbody b').text()).toBe('高亮')
  })

  it('renders loading row', () => {
    const wrapper = mount(DpTable, {
      props: { comp: { columns, data: [], loading: true } },
    })
    expect(wrapper.text()).toContain('加载中')
  })
})
