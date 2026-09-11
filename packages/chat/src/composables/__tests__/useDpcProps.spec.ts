import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { useDpcProps } from '../useDpcProps'

const Host = defineComponent({
  props: {
    theme: { type: Object, default: undefined },
    comp: { type: Object, default: undefined },
  },
  setup(props) {
    const { comp, style, rootAttrs } = useDpcProps<{ text: string; show: boolean }>(props, {
      compDefaults: { text: 'default', show: false },
    })
    return () =>
      h(
        'div',
        { ...rootAttrs.value, 'data-text': comp.value.text, 'data-show': String(comp.value.show) },
        style.value.variant,
      )
  },
})

describe('useDpcProps', () => {
  it('merges comp defaults with provided comp', () => {
    const wrapper = mount(Host, { props: { comp: { show: true } } })
    expect(wrapper.attributes('data-text')).toBe('default')
    expect(wrapper.attributes('data-show')).toBe('true')
  })

  it('normalizes cssVars with --dpc- prefix', async () => {
    const wrapper = mount(Host, {
      props: { theme: { cssVars: { 'color-primary': '#7c3aed' } } },
    })
    expect(wrapper.attributes('style')).toContain('--dpc-color-primary')
    expect(wrapper.attributes('style')).toContain('#7c3aed')
  })

  it('merges passthrough class with theme.class', async () => {
    const wrapper = mount(Host, {
      attrs: { class: 'outer' },
      props: { theme: { class: 'inner' } },
    })
    expect(wrapper.classes()).toContain('outer')
    expect(wrapper.classes()).toContain('inner')
  })
})
