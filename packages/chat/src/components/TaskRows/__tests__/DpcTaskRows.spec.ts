import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcTaskRows from '../DpcTaskRows.vue'

const ROWS = [
  {
    key: 'verify',
    label: 'Verify records',
    amount: '12 items',
    status: 'done' as const,
    details: [{ label: 'Matched IDs', meta: '12/12' }],
  },
  {
    key: 'index',
    label: 'Build list',
    amount: '7 SKUs',
    status: 'running' as const,
    step: 2,
    details: [{ label: 'Reading export', meta: '3 files' }],
  },
]

describe('DpcTaskRows', () => {
  it('renders rows with status pills and step numbers', () => {
    const wrapper = mount(DpcTaskRows, {
      props: { comp: { rows: ROWS, autoPlay: false } },
    })

    expect(wrapper.text()).toContain('Verify records')
    expect(wrapper.text()).toContain('Completed')
    expect(wrapper.text()).toContain('2')
  })

  it('emits toggleRow when a row is expanded', async () => {
    const wrapper = mount(DpcTaskRows, {
      props: { comp: { rows: ROWS, autoPlay: false } },
    })

    await wrapper.findAll('button')[0]?.trigger('click')

    expect(wrapper.emitted('toggleRow')?.[0]).toEqual(['verify', true])
  })

  it('renders the list variant inside a single card', () => {
    const wrapper = mount(DpcTaskRows, {
      props: { comp: { rows: ROWS, variant: 'List', autoPlay: false } },
    })

    expect(wrapper.classes()).toContain('rounded-[var(--dpc-radius-card)]')
    expect(wrapper.findAll('.dpc-task-rows__item')).toHaveLength(2)
  })
})
