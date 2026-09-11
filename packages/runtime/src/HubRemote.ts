/**
 * <HubRemote> —— 声明式运行时远程组件。
 *
 * ```vue
 * <HubRemote pkg="oui-hub:@oui/button" variant="primary" @click="onClick">保存</HubRemote>
 * ```
 *
 * - attrs（含事件/未声明 prop）与 slots（除保留名 loading/error）全部透传给远程组件；
 * - loading/error 插槽控制加载与失败态；error 插槽参数 { message, retry }；
 * - pkg 响应式：变化即重新加载（竞态由内部代际号丢弃过期结果）。
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  shallowRef,
  watch,
  type Component,
  type PropType,
  type Slot,
} from 'vue'

import { loadRemote, type ResolvedPkg } from './loader'

const STATE_SLOT_KEYS = new Set(['loading', 'error'])

export const HubRemote = defineComponent({
  name: 'HubRemote',
  props: {
    /** 远程包：moduleUrl 字符串或 { moduleUrl, cssUrls?, peer? }。 */
    pkg: { type: [String, Object] as PropType<string | ResolvedPkg>, required: true },
  },
  setup(props, { attrs, slots }) {
    const state = shallowRef<'loading' | 'error' | 'ready'>('loading')
    const errorMsg = shallowRef('')
    const resolved = shallowRef<Component | null>(null)
    let gen = 0

    async function activate(): Promise<void> {
      const cur = ++gen
      state.value = 'loading'
      try {
        const comp = await loadRemote(props.pkg)
        if (cur !== gen) return // 过期结果：pkg 已切换或已卸载
        resolved.value = comp
        state.value = 'ready'
      } catch (e) {
        if (cur !== gen) return
        errorMsg.value = e instanceof Error ? e.message : String(e)
        state.value = 'error'
      }
    }

    watch(() => props.pkg, activate, { immediate: true })
    onBeforeUnmount(() => {
      gen++
    })

    return () => {
      if (state.value !== 'ready' || !resolved.value) {
        if (state.value === 'error' && slots.error) {
          return slots.error({ message: errorMsg.value, retry: activate })
        }
        if (state.value === 'loading' && slots.loading) {
          return slots.loading({})
        }
        return h('span', null)
      }
      const forwarded: Record<string, Slot> = {}
      for (const key of Object.keys(slots)) {
        if (!STATE_SLOT_KEYS.has(key) && slots[key]) forwarded[key] = slots[key]!
      }
      return h(resolved.value, { ...attrs }, forwarded)
    }
  },
})

export default HubRemote
