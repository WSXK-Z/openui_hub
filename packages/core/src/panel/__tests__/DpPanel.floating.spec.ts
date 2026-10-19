import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import DpPanel from '../DpPanel.vue'

afterEach(() => {
  window.localStorage.clear()
})

describe('DpPanel floating features', () => {
  it('applies floating anchor position and size', () => {
    const wrapper = mount(DpPanel, {
      props: {
        comp: {
          title: '浮动面板',
          fixed: true,
          anchor: 'top-left',
          offset: [10, 20],
          width: 320,
          height: 200,
        },
      },
    })
    expect(wrapper.classes()).toContain('dp-panel--floating')
    expect(wrapper.classes()).toContain('dp-panel--anchor-top-left')
    const style = wrapper.attributes('style')
    expect(style).toContain('--dp-panel-offset-x: 10px')
    expect(style).toContain('--dp-panel-offset-y: 20px')
    expect(style).toContain('width: 320px')
    expect(style).toContain('height: 200px')
  })

  it('exposes reset / setOffset / setSize / collapse / expand', async () => {
    const wrapper = mount(DpPanel, {
      props: {
        comp: {
          title: '面板',
          fixed: true,
          collapsible: true,
          offset: [4, 8],
          width: 300,
          height: 180,
        },
      },
    })
    const vm = wrapper.vm as unknown as {
      setOffset: (offset: [number, number]) => void
      setSize: (size: { width?: number; height?: number }) => void
      reset: () => void
      collapse: () => void
      expand: () => void
    }

    vm.setOffset([30, 40])
    vm.setSize({ width: 360, height: 240 })
    await nextTick()
    expect(wrapper.attributes('style')).toContain('--dp-panel-offset-x: 30px')
    expect(wrapper.attributes('style')).toContain('width: 360px')

    vm.collapse()
    await nextTick()
    expect((wrapper.find('.dp-panel__body').element as HTMLElement).style.display).toBe('none')
    expect(wrapper.emitted('collapse')).toHaveLength(1)

    vm.expand()
    await nextTick()
    expect((wrapper.find('.dp-panel__body').element as HTMLElement).style.display).toBe('')

    vm.reset()
    await nextTick()
    expect(wrapper.attributes('style')).toContain('--dp-panel-offset-x: 4px')
    expect(wrapper.attributes('style')).toContain('width: 300px')
  })

  it('restores persisted offset, size and collapsed state', async () => {
    window.localStorage.setItem(
      'dp-panel:persisted',
      JSON.stringify({ offset: [12, 24], width: 280, height: 160, collapsed: true }),
    )
    const wrapper = mount(DpPanel, {
      props: { comp: { title: '持久化', fixed: true, persist: 'persisted' } },
    })
    await nextTick()
    expect(wrapper.attributes('style')).toContain('--dp-panel-offset-x: 12px')
    expect(wrapper.attributes('style')).toContain('width: 280px')
    expect((wrapper.find('.dp-panel__body').element as HTMLElement).style.display).toBe('none')
  })

  it('renders tools slot with state helpers', () => {
    const wrapper = mount(DpPanel, {
      props: { comp: { title: '工具', fixed: true, showTools: true, offset: [3, 4] } },
      slots: {
        tools: (slotProps: { offset: [number, number] }) =>
          h('button', { class: 'custom-tool' }, String(slotProps.offset[0])),
      },
    })
    expect(wrapper.find('.dp-panel__tools').exists()).toBe(true)
    expect(wrapper.find('.custom-tool').text()).toBe('3')
  })
})
