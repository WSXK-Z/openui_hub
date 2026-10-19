import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DpcLoadingState from '../DpcLoadingState.vue'

describe('DpcLoadingState', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the label and a 3x3 pixel grid', () => {
    const wrapper = mount(DpcLoadingState, { props: { comp: { label: 'Working' } } })

    expect(wrapper.text()).toContain('Working')
    expect(wrapper.findAll('.dpc-loading-state__pixel')).toHaveLength(9)
  })

  it('uses variant defaults for label and pixel shape', () => {
    const surfer = mount(DpcLoadingState, { props: { comp: { variant: 'Surfer' } } })
    expect(surfer.text()).toContain('Subway surfing')
    expect(surfer.find('.dpc-loading-state__media').exists()).toBe(true)
    expect(surfer.findAll('.dpc-loading-state__pixel').length).toBeGreaterThanOrEqual(9)

    const dots = mount(DpcLoadingState, { props: { comp: { variant: 'Dots' } } })
    expect(dots.findAll('.dpc-loading-state__pixel')[0]?.classes()).toContain('rounded-full')

    const orbit = mount(DpcLoadingState, { props: { comp: { variant: 'Orbit' } } })
    expect(orbit.text()).toContain('Churning')
  })

  it('ticks the elapsed timer', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DpcLoadingState, { props: { comp: { label: 'Loading' } } })

    vi.advanceTimersByTime(1200)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.dpc-loading-state__elapsed').text()).toBe('1.2s')
  })

  it('hides the timer when showElapsed is false', () => {
    const wrapper = mount(DpcLoadingState, {
      props: { comp: { label: 'Loading', showElapsed: false } },
    })

    expect(wrapper.find('.dpc-loading-state__elapsed').exists()).toBe(false)
  })

  it('merges theme cssVars into the root element', () => {
    const wrapper = mount(DpcLoadingState, {
      props: { theme: { cssVars: { 'color-ink': '#111111' } } },
    })

    expect(wrapper.attributes('style')).toContain('--dpc-color-ink')
  })
})
