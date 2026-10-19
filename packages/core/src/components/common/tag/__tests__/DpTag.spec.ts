import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpTag from '../DpTag.vue'

describe('DpTag', () => {
  it('toggles checked state when checkable', async () => {
    const wrapper = mount(DpTag, {
      props: { comp: { checkable: true } },
      slots: { default: '标签' },
    })
    expect(wrapper.attributes('role')).toBe('checkbox')
    expect(wrapper.attributes('aria-checked')).toBe('false')
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:checked')?.[0]).toEqual([true])
    expect(wrapper.classes()).toContain('dp-tag--checkable')
  })

  it('does not toggle when disabled', async () => {
    const wrapper = mount(DpTag, {
      props: { comp: { checkable: true, disabled: true } },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:checked')).toBeUndefined()
  })

  it('emits close and blocks close when disabled', async () => {
    const wrapper = mount(DpTag, { props: { comp: { closable: true } } })
    await wrapper.find('.dp-tag__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    const disabled = mount(DpTag, { props: { comp: { closable: true, disabled: true } } })
    await disabled.find('.dp-tag__close').trigger('click')
    expect(disabled.emitted('close')).toBeUndefined()
  })
})
