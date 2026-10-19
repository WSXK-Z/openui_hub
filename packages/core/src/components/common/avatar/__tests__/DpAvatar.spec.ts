import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpAvatar from '../DpAvatar.vue'

describe('DpAvatar', () => {
  it('renders fallback text from alt', () => {
    const wrapper = mount(DpAvatar, { props: { comp: { alt: '张三' } } })
    expect(wrapper.text()).toContain('张')
  })

  it('applies color and object-fit from theme', () => {
    const wrapper = mount(DpAvatar, {
      props: {
        comp: { src: '/avatar.png', alt: 'a' },
        theme: { color: '#123456', objectFit: 'contain' },
      },
    })
    expect(wrapper.find('.dp-avatar').attributes('style')).toContain('background-color')
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('style')).toContain('object-fit: contain')
  })
})
