import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcSender from '../DpcSender.vue'

describe('DpcSender', () => {
  it('emits send with trimmed content on Enter', async () => {
    const wrapper = mount(DpcSender)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('  hello  ')
    await textarea.trigger('keydown', { key: 'Enter' })
    const sent = wrapper.emitted('send')
    expect(sent).toHaveLength(1)
    expect(sent?.[0]).toEqual(['hello'])
  })

  it('does not emit send when input is empty', async () => {
    const wrapper = mount(DpcSender)
    const textarea = wrapper.find('textarea')
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('does not emit send when disabled', async () => {
    const wrapper = mount(DpcSender, { props: { comp: { disabled: true } } })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hi')
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('emits stop when send button clicked while loading', async () => {
    const wrapper = mount(DpcSender, { props: { comp: { loading: true } } })
    await wrapper.find('.dpc-sender__send').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })
})
