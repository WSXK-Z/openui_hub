import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpSteps from '../DpSteps.vue'

const steps = [
  { title: '填写信息' },
  { title: '提交审核' },
  { title: '完成' },
]

describe('DpSteps', () => {
  it('renders horizontal layout and finish markers', () => {
    const wrapper = mount(DpSteps, { props: { comp: { steps, current: 1 } } })
    expect(wrapper.classes()).toContain('dp-steps--horizontal')
    const dots = wrapper.findAll('.dp-steps__dot')
    expect(dots[0]?.text()).toBe('✓')
    expect(dots[1]?.text()).toBe('2')
  })

  it('supports vertical layout', () => {
    const wrapper = mount(DpSteps, { props: { comp: { steps, current: 0, vertical: true } } })
    expect(wrapper.classes()).toContain('dp-steps--vertical')
  })

  it('marks the current step as error when status is error', () => {
    const wrapper = mount(DpSteps, { props: { comp: { steps, current: 1, status: 'error' } } })
    const dots = wrapper.findAll('.dp-steps__dot')
    expect(dots[1]?.text()).toBe('!')
    expect(dots[1]?.classes()).toContain('bg-[var(--dp-color-danger)]')
  })

  it('marks all steps as finished when status is finish', () => {
    const wrapper = mount(DpSteps, { props: { comp: { steps, current: 0, status: 'finish' } } })
    expect(wrapper.findAll('.dp-steps__dot').every((dot) => dot.text() === '✓')).toBe(true)
  })
})
