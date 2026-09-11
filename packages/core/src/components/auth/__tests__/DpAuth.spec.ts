import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DpAuth from '../DpAuth.vue'
import { setAuthCodes } from '../store'

describe('DpAuth', () => {
  it('renders slot when has permission', () => {
    setAuthCodes(['dashboard:view'])
    const wrapper = mount(DpAuth, {
      props: { comp: { code: 'dashboard:view' } },
      slots: { default: '可见内容' },
    })
    expect(wrapper.text()).toContain('可见内容')
  })

  it('renders fallback when no permission', () => {
    setAuthCodes(['dashboard:view'])
    const wrapper = mount(DpAuth, {
      props: { comp: { code: 'no-such-code' } },
      slots: { default: '不应显示', fallback: '无权限提示' },
    })
    expect(wrapper.text()).toContain('无权限提示')
    expect(wrapper.text()).not.toContain('不应显示')
  })
})
