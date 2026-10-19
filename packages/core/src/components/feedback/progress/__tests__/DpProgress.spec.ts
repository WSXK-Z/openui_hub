import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpProgress from '../DpProgress.vue'

describe('DpProgress', () => {
  it('renders a line bar by default', () => {
    const wrapper = mount(DpProgress, { props: { modelValue: 40 } })
    expect(wrapper.find('.dp-progress__bar').exists()).toBe(true)
    expect(wrapper.find('.dp-progress__indicator').attributes('style')).toContain('width: 40%')
  })

  it('renders a circle with status color and indicator text', () => {
    const wrapper = mount(DpProgress, {
      props: {
        modelValue: 60,
        theme: { type: 'circle', status: 'success', showIndicator: true },
      },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('.dp-progress__indicator').classes()).toContain('stroke-[var(--dp-color-success)]')
    expect(wrapper.find('.dp-progress__indicator-text').text()).toBe('60%')
  })

  it('clamps percent to max', () => {
    const wrapper = mount(DpProgress, {
      props: { modelValue: 150, theme: { showIndicator: true } },
    })
    expect(wrapper.find('.dp-progress__indicator-text').text()).toBe('100%')
  })
})
