import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DpcApprovalCard from '../DpcApprovalCard.vue'

const QUESTIONS = [
  { q: 'How many flavors?', type: 'radio' as const, options: ['Three', 'Five'] },
  { q: 'Which mix-ins?', type: 'check' as const, options: ['Chips', 'Waffle'] },
]

describe('DpcApprovalCard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits answerChange and auto-advances on radio choice', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DpcApprovalCard, { props: { comp: { questions: QUESTIONS } } })

    expect(wrapper.text()).toContain('How many flavors?')

    await wrapper.findAll('button[aria-pressed]')[1]?.trigger('click')
    expect(wrapper.emitted('answerChange')?.[0]).toEqual([0, [1]])

    vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Which mix-ins?')
  })

  it('waits for multi-select then submits all answers', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DpcApprovalCard, { props: { comp: { questions: QUESTIONS } } })

    await wrapper.findAll('button[aria-pressed]')[0]?.trigger('click')
    vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    const options = wrapper.findAll('button[aria-pressed]')
    await options[0]?.trigger('click')
    await options[1]?.trigger('click')

    const submit = wrapper.findAll('button').find((button) => button.text().includes('Send'))
    expect(submit).toBeDefined()
    await submit?.trigger('click')

    expect(wrapper.emitted('submitted')?.[0]).toEqual([{ 0: [0], 1: [0, 1] }])
    expect(wrapper.text()).toContain('Answers sent')
  })

  it('skips forward without answering', async () => {
    const wrapper = mount(DpcApprovalCard, {
      props: { comp: { questions: QUESTIONS, defaultOpen: true } },
    })

    const skip = wrapper.findAll('button').find((button) => button.text() === 'Skip')
    await skip?.trigger('click')

    expect(wrapper.text()).toContain('Which mix-ins?')
  })

  it('dismisses and reopens the card', async () => {
    const wrapper = mount(DpcApprovalCard, { props: { comp: { questions: QUESTIONS } } })

    await wrapper.find('button[aria-label="Dismiss"]').trigger('click')
    expect(wrapper.text()).not.toContain('How many flavors?')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Open approval')
      ?.trigger('click')
    expect(wrapper.text()).toContain('How many flavors?')
  })
})
