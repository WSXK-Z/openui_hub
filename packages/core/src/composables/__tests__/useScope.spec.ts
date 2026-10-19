import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Fragment, createVNode, defineComponent, h, type VNode } from 'vue'
import { applyScopeAttrs, useScope } from '../useScope'

describe('applyScopeAttrs', () => {
  const attrs = { 'data-dp-theme': 'dark', class: 'scope', style: { color: 'red' } }

  it('merges attributes into every root element', () => {
    const nodes = applyScopeAttrs([h('div', { class: 'a' }), h('span', { class: 'b' })], attrs)

    expect(nodes).toHaveLength(2)
    expect((nodes[0]?.props as Record<string, unknown> | undefined)?.class).toBe('a scope')
    expect((nodes[1]?.props as Record<string, unknown> | undefined)?.style).toMatchObject({
      color: 'red',
    })
  })

  it('flattens nested arrays and fragments', () => {
    const fragment = createVNode(Fragment, null, [h('i'), h('b')])
    const nodes = applyScopeAttrs([[h('p')], fragment], attrs)

    expect(nodes).toHaveLength(3)
    for (const node of nodes) {
      expect((node.props as Record<string, unknown>)['data-dp-theme']).toBe('dark')
    }
  })

  it('keeps text and comment nodes unchanged', () => {
    const nodes = applyScopeAttrs(['text', h('div')], attrs)

    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toBe('text')
    expect((nodes[1]?.props as Record<string, unknown> | undefined)?.['data-dp-theme']).toBe('dark')
  })
})

describe('useScope', () => {
  it('renders slot children without a wrapper element', () => {
    const Scope = useScope()
    const Host = defineComponent({
      setup() {
        return () =>
          h(Scope, { scopeAttrs: { 'data-dp-theme': 'dark' } }, {
            default: () => [h('div', { class: 'a' }, 'A'), h('div', { class: 'b' }, 'B')],
          })
      },
    })

    const wrapper = mount(Host)
    const html = wrapper.html()
    expect(html.startsWith('<div')).toBe(true)
    expect(html).not.toContain('theme-scope')
    expect(wrapper.find('.a').attributes('data-dp-theme')).toBe('dark')
    expect(wrapper.find('.b').attributes('data-dp-theme')).toBe('dark')
  })

  it('reacts to attribute changes', async () => {
    const Scope = useScope()
    const Host = defineComponent({
      props: { mode: { type: String, default: 'dark' } },
      setup(props) {
        return () =>
          h(Scope, { scopeAttrs: { 'data-dp-theme': props.mode } as Record<string, unknown> }, {
            default: () => h('div', { class: 'inner' }),
          })
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.find('.inner').attributes('data-dp-theme')).toBe('dark')

    await wrapper.setProps({ mode: 'light' })
    expect(wrapper.find('.inner').attributes('data-dp-theme')).toBe('light')
  })

  it('drops non-element nodes when cloning', () => {
    const Scope = useScope()
    const Host = defineComponent({
      setup() {
        const children: VNode[] = [h('div', { class: 'only' })]
        return () => h(Scope, { scopeAttrs: { 'data-x': '1' } }, { default: () => children })
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.find('.only').attributes('data-x')).toBe('1')
  })
})
