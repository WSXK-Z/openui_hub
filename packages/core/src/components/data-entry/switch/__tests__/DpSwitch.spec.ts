import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpSwitch from '../DpSwitch.vue'

describe('DpSwitch', () => {
  it('renders switch with role and toggles on click', async () => {
    const wrapper = mount(DpSwitch, { props: { modelValue: false } })
    const root = wrapper.find('[role="switch"]')
    expect(root.exists()).toBe(true)
    await root.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('renders label', () => {
    const wrapper = mount(DpSwitch, { props: { modelValue: false, comp: { label: '启用' } } })
    expect(wrapper.text()).toContain('启用')
  })
})
