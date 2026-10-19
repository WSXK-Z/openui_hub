import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpBreadcrumb from '../DpBreadcrumb.vue'

describe('DpBreadcrumb', () => {
  it('renders a custom separator', () => {
    const wrapper = mount(DpBreadcrumb, {
      props: {
        comp: {
          separator: '>',
          items: [{ label: '首页', href: '/' }, { label: '组件' }],
        },
      },
    })
    expect(wrapper.find('.dp-breadcrumb__separator').text()).toBe('>')
  })
})
