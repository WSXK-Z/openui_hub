import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpSpin from '../DpSpin.vue'

describe('DpSpin', () => {
  it('renders description below the indicator', () => {
    const wrapper = mount(DpSpin, { props: { comp: { description: '加载中' } } })
    expect(wrapper.find('.dp-spin').exists()).toBe(true)
    expect(wrapper.text()).toContain('加载中')
    expect(wrapper.attributes('role')).toBe('status')
  })
})
