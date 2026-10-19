import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DpcThinkingState from '../DpcThinkingState.vue'

const ROWS = [
  { primary: 'Reading briefs' },
  { primary: 'Scanning suppliers', secondary: '6 items' },
  { primary: 'Comparing notes' },
  { primary: 'Writing report' },
]

describe('DpcThinkingState', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the active label and expands into all rows once settled', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DpcThinkingState, {
      props: {
        comp: {
          variant: 'Steps',
          rows: ROWS,
          active: 'Thinking hard',
          done: 'Thought for 4 seconds',
        },
      },
    })

    expect(wrapper.text()).toContain('Thinking hard')

    vi.advanceTimersByTime(800 + 600 + 1800 + 2600 + 1600)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Thought for 4 seconds')
    expect(wrapper.findAll('.dpc-thinking__row')).toHaveLength(4)
    expect(wrapper.emitted('settled')).toHaveLength(1)
  })

  it('toggles the trace manually', async () => {
    const wrapper = mount(DpcThinkingState, {
      props: { comp: { rows: ROWS, autoPlay: false } },
    })

    const header = wrapper.find('.dpc-thinking__header')
    expect(header.attributes('aria-expanded')).toBe('false')

    await header.trigger('click')

    expect(header.attributes('aria-expanded')).toBe('true')
    expect(wrapper.emitted('toggle')?.[0]).toEqual([true])
  })

  it('renders search rows as links and query text', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DpcThinkingState, {
      props: {
        comp: {
          variant: 'Search',
          query: 'best supplier',
          rows: [{ primary: 'Joy Cone', secondary: 'joycone.com', href: 'https://example.com' }],
        },
      },
    })

    vi.advanceTimersByTime(800 + 600 + 1800)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('best supplier')
    expect(wrapper.find('.dpc-thinking__row').attributes('href')).toBe('https://example.com')
  })
})
