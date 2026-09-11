import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { useDpProps } from '../useDpProps'
import type { DpProps } from '../../types'

interface HostComp {
  label?: string
}

const Host = defineComponent({
  name: 'Host',
  inheritAttrs: false,
  props: ['theme', 'comp'] as const,
  setup(props) {
    const { comp, style, rootAttrs } = useDpProps<HostComp>(props as DpProps<HostComp>, {
      compDefaults: { label: '默认标签' },
      themeDefaults: { size: 'small' },
    })
    return () =>
      h(
        'div',
        {
          ...rootAttrs.value,
          'data-comp': comp.value.label,
          'data-size': style.value.size,
        },
        'content',
      )
  },
})

describe('useDpProps', () => {
  it('merges comp defaults', () => {
    const wrapper = mount(Host)
    expect(wrapper.attributes('data-comp')).toBe('默认标签')

    const wrapper2 = mount(Host, { props: { comp: { label: '自定义' } } })
    expect(wrapper2.attributes('data-comp')).toBe('自定义')
  })

  it('merges theme defaults and overrides', async () => {
    const wrapper = mount(Host)
    expect(wrapper.attributes('data-size')).toBe('small')

    await wrapper.setProps({ theme: { size: 'large' } })
    expect(wrapper.attributes('data-size')).toBe('large')
  })

  it('merges attrs class and theme.class / theme.style / cssVars into root', () => {
    const wrapper = mount(Host, {
      attrs: { class: 'foo' },
      props: {
        theme: {
          class: 'bar',
          style: 'color: red',
          cssVars: { 'color-primary': '#000' },
        },
      },
    })
    const classes = wrapper.classes()
    expect(classes).toContain('foo')
    expect(classes).toContain('bar')
    const styleAttr = wrapper.attributes('style')
    expect(styleAttr).toContain('color: red')
    expect(styleAttr).toContain('--dp-color-primary')
    expect(styleAttr).toContain('#000')
  })
})
