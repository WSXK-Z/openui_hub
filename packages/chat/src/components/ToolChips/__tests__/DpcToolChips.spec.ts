import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcToolChips from '../DpcToolChips.vue'

const STEPS = [
  {
    icon: 'think',
    label: 'Thinking',
    chip: 'Planning…',
    detail: [{ text: 'Weekend demand is higher.' }],
  },
  {
    icon: 'write',
    label: 'Write 20 lines',
    chip: 'Schedule.tsx',
    mono: true,
    detail: [{ text: '+ const windows = slots', tone: 'add' as const }],
  },
]

const DIFFS = [{ file: 'Schedule.tsx', add: 12, del: 3 }]

describe('DpcToolChips', () => {
  it('reveals rows and diff chips immediately when autoPlay is off', () => {
    const wrapper = mount(DpcToolChips, {
      props: { comp: { steps: STEPS, diffs: DIFFS, autoPlay: false } },
    })

    expect(wrapper.text()).toContain('2 tool calls')
    expect(wrapper.findAll('.dpc-tool-chips__row')).toHaveLength(2)
    expect(wrapper.text()).toContain('Schedule.tsx')
    expect(wrapper.text()).toContain('+12')
  })

  it('emits toggleRow when a row is opened', async () => {
    const wrapper = mount(DpcToolChips, {
      props: { comp: { steps: STEPS, diffs: DIFFS, autoPlay: false } },
    })

    await wrapper.findAll('.dpc-tool-chips__row')[1]?.trigger('click')

    expect(wrapper.emitted('toggleRow')?.[0]).toEqual(['Write 20 lines', true])
  })

  it('collapses the run from the header', async () => {
    const wrapper = mount(DpcToolChips, {
      props: { comp: { steps: STEPS, diffs: DIFFS, autoPlay: false } },
    })

    await wrapper.find('.dpc-tool-chips__header').trigger('click')

    expect(wrapper.emitted('openChange')?.[0]).toEqual([false])
  })
})
