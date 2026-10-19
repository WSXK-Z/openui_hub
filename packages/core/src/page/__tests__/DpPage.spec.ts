import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import DpPage from '../DpPage.vue'
import DpPanel from '../../panel/DpPanel.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ meta: {} }),
}))

describe('DpPage', () => {
  it('renders the seven default panel anchors', () => {
    const wrapper = mount(DpPage)
    expect(wrapper.findAll('.dp-page__anchor')).toHaveLength(7)
    expect(wrapper.find('[data-dp-panel-anchor="top-right"]').exists()).toBe(true)
  })

  it('registers panels and exposes lookup / bring-to-front', async () => {
    const wrapper = mount(DpPage, {
      slots: {
        default: () =>
          h(DpPanel, {
            comp: { title: '浮动面板', name: 'floating', fixed: true },
          }),
      },
    })
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as unknown as {
      getPanels: () => Array<{ name?: string }>
      getPanel: (name: string) => unknown
      bringToFront: (name: string) => boolean
    }
    const panels = vm.getPanels()
    expect(panels).toHaveLength(1)
    expect(panels[0]?.name).toBe('floating')
    expect(vm.getPanel('floating')).toBeDefined()
    expect(vm.bringToFront('floating')).toBe(true)
    expect(vm.bringToFront('missing')).toBe(false)
  })

  it('supports a custom anchor subset and gap', () => {
    const wrapper = mount(DpPage, {
      props: { comp: { anchors: ['top-left', 'bottom-right'], anchorGap: 24 } },
    })
    expect(wrapper.findAll('.dp-page__anchor')).toHaveLength(2)
    expect(wrapper.attributes('style')).toContain('--dp-page-anchor-gap: 24px')
  })
})
