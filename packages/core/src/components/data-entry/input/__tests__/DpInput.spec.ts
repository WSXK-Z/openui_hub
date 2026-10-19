import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpInput from '../DpInput.vue'

describe('DpInput', () => {
  it('emits model value on input', async () => {
    const wrapper = mount(DpInput, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('hello')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })

  it('clears value when clear button clicked', async () => {
    const wrapper = mount(DpInput, { props: { modelValue: 'abc', comp: { clearable: true } } })
    expect(wrapper.find('.dp-input__clear').exists()).toBe(true)
    await wrapper.find('.dp-input__clear').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
  })

  it('renders label', () => {
    const wrapper = mount(DpInput, { props: { comp: { label: '用户名' } } })
    expect(wrapper.text()).toContain('用户名')
  })

  it('applies maxlength and shows character count', () => {
    const wrapper = mount(DpInput, {
      props: { modelValue: 'abc', comp: { maxlength: 10, showCount: true } },
    })
    expect(wrapper.find('input').attributes('maxlength')).toBe('10')
    expect(wrapper.find('.dp-input__count').text()).toContain('3/10')
  })

  it('renders prefix and suffix slots', () => {
    const wrapper = mount(DpInput, {
      slots: { prefix: '￥', suffix: '元' },
    })
    expect(wrapper.find('.dp-input__prefix').text()).toBe('￥')
    expect(wrapper.find('.dp-input__suffix').text()).toBe('元')
  })
})
