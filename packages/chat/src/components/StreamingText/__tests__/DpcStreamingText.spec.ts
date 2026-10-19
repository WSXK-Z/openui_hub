import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DpcStreamingText from '../DpcStreamingText.vue'

const SOURCES = [
  { name: 'Scoop Data', domain: 'scoopdata.io', href: 'https://scoopdata.io/' },
  { name: 'Trends Index', domain: 'trends.google.com', href: 'https://trends.google.com/' },
]

describe('DpcStreamingText', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('streams tokens and emits done once', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DpcStreamingText, {
      props: {
        comp: {
          content: [{ text: 'Hello' }, { text: 'world' }, { text: '', cite: true }],
          sources: SOURCES,
          speed: 10,
          loop: false,
        },
      },
    })

    expect(wrapper.text()).not.toContain('Hello')

    vi.advanceTimersByTime(40)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('world')
    expect(wrapper.find('.dpc-streaming-text__cite').text()).toContain('scoopdata.io')
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  it('shows follow-ups and emits the clicked one', async () => {
    const wrapper = mount(DpcStreamingText, {
      props: {
        comp: {
          content: [{ text: 'Done' }],
          followUps: ['Next question'],
          autoPlay: false,
          loop: false,
        },
      },
    })

    await wrapper.find('.dpc-streaming-text__followups button').trigger('click')

    expect(wrapper.emitted('followUp')?.[0]).toEqual(['Next question', 0])
  })

  it('exposes imperative complete()', async () => {
    const wrapper = mount(DpcStreamingText, {
      props: { comp: { content: [{ text: 'A' }, { text: 'B' }], autoPlay: false, loop: false } },
    })

    ;(wrapper.vm as unknown as { complete: () => void }).complete()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
  })
})
