import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpCard from '../DpCard.vue'

describe('DpCard', () => {
  it('renders cover, header-extra and footer slots', () => {
    const wrapper = mount(DpCard, {
      props: { comp: { title: '标题' } },
      slots: {
        cover: '<img alt="cover" />',
        'header-extra': '<button>更多</button>',
        default: '内容',
        footer: '页脚',
      },
    })
    expect(wrapper.find('.dp-card__cover').exists()).toBe(true)
    expect(wrapper.find('.dp-card__header-extra').text()).toContain('更多')
    expect(wrapper.find('.dp-card__footer').text()).toContain('页脚')
  })

  it('hides footer when slot is absent', () => {
    const wrapper = mount(DpCard, { slots: { default: '内容' } })
    expect(wrapper.find('.dp-card__footer').exists()).toBe(false)
  })
})
