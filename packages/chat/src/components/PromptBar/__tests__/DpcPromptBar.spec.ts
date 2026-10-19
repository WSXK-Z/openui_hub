import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpcPromptBar from '../DpcPromptBar.vue'

const MODELS = [
  { key: 'flagship', name: 'Sprinkles 5', tag: 'Flagship' },
  { key: 'basic', name: 'Vanilla 1', tag: 'Basic' },
]

describe('DpcPromptBar', () => {
  it('sends trimmed input on Enter', async () => {
    const wrapper = mount(DpcPromptBar, {
      props: { comp: { models: MODELS } },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('  hello world  ')
    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')?.[0]).toEqual(['hello world'])
  })

  it('does not send empty input', async () => {
    const wrapper = mount(DpcPromptBar, { props: { comp: { models: MODELS } } })

    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('switches between model options', async () => {
    const wrapper = mount(DpcPromptBar, { props: { comp: { models: MODELS } } })

    const picker = wrapper.findAll('button').find((button) => button.text().includes('Sprinkles 5'))
    await picker?.trigger('click')

    const basic = wrapper.findAll('button').find((button) => button.text().includes('Vanilla 1'))
    await basic?.trigger('click')

    expect(wrapper.emitted('modelChange')?.[0]).toEqual(['basic'])
  })

  it('emits stop while loading', async () => {
    const wrapper = mount(DpcPromptBar, {
      props: { comp: { models: MODELS, loading: true } },
    })

    await wrapper.find('button[aria-label="Stop"]').trigger('click')

    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  it('renders attachments and emits removal', async () => {
    const wrapper = mount(DpcPromptBar, {
      props: { comp: { models: MODELS, attachments: ['chart.png'] } },
    })

    expect(wrapper.text()).toContain('chart.png')

    await wrapper.find('button[aria-label="Remove chart.png"]').trigger('click')

    expect(wrapper.emitted('removeAttachment')?.[0]).toEqual([0])
  })
})
