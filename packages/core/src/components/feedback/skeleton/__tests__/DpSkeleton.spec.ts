import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpSkeleton from '../DpSkeleton.vue'

describe('DpSkeleton', () => {
  it('renders rows and disables animation when animated is false', () => {
    const wrapper = mount(DpSkeleton, { props: { comp: { rows: 3, animated: false } } })
    expect(wrapper.findAll('.dp-skeleton')).toHaveLength(3)
    expect(wrapper.find('.dp-skeleton').classes()).toContain('dp-skeleton--static')
  })

  it('uses circle variant with equal width and height', () => {
    const wrapper = mount(DpSkeleton, { props: { comp: { variant: 'circle', width: 40 } } })
    expect(wrapper.find('.dp-skeleton').attributes('style')).toContain('width: 40px')
    expect(wrapper.find('.dp-skeleton').attributes('style')).toContain('height: 40px')
  })
})
