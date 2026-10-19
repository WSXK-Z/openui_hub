import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpAlert from '../DpAlert.vue'

describe('DpAlert', () => {
  it('emits close and hides when close button is clicked', async () => {
    const wrapper = mount(DpAlert, {
      props: { comp: { title: '提示', closable: true } },
      slots: { default: '内容' },
    })
    await wrapper.find('button[aria-label="close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.find('.dp-alert').exists()).toBe(false)
  })
})
