import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcContextCards from '../DpcContextCards.vue'

const CHUNKS = [
  {
    title: 'Onboarding rule',
    chars: '290 characters',
    body: 'Cold-chain certification must be verified.',
    source: 'SOP.pdf',
    badge: 'PDF',
    tone: 'red',
  },
  {
    title: 'Demand row',
    chars: '1,250 characters',
    body: 'Q4 velocity table.',
    source: 'Export.csv',
    badge: 'CSV',
    tone: 'green',
  },
]

describe('DpcContextCards', () => {
  it('renders the header count and every chunk', () => {
    const wrapper = mount(DpcContextCards, { props: { comp: { chunks: CHUNKS } } })

    expect(wrapper.text()).toContain('All chunks')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('Onboarding rule')
    expect(wrapper.text()).toContain('Export.csv')
  })

  it('uses the provided count label override', () => {
    const wrapper = mount(DpcContextCards, {
      props: { comp: { chunks: CHUNKS, labels: { header: 'Retrieved', count: '32' } } },
    })

    expect(wrapper.text()).toContain('Retrieved')
    expect(wrapper.text()).toContain('32')
  })

  it('maps the badge tone to a design token', () => {
    const wrapper = mount(DpcContextCards, {
      props: { comp: { chunks: CHUNKS, autoPlay: false } },
    })

    const badges = wrapper.findAll('span').filter((node) => node.text() === 'PDF')
    expect(badges[0]?.attributes('style')).toContain('--dpc-color-red')
  })
})
