/**
 * <HubRemoteShadow> —— shadow DOM 隔离版远程组件。
 *
 * 与 <HubRemote> 的对外 API 一致（pkg 响应式、attrs/slots 透传、loading/error 插槽、
 * error 插槽参数 { message, retry }），差异只在**渲染边界**：
 *
 * - 远程模块的 `cssUrls` 注入到本组件挂载的 **shadow root**（不落 `document.head`），
 *   远程组件也渲染在 shadow 内 —— 发布包里的 `!important` 全局规则（`article{height:auto}`、
 *   `.grid{display:block}`、`*{box-sizing:content-box}` …）无法命中宿主页面，宿主样式也不进入 shadow；
 * - loading/error 插槽内容仍渲染在 **light DOM**（经 shadow 内的 `<slot>` 投射），因为宿主页面的
 *   样式（UnoCSS 等）只作用于 light DOM —— 放进 shadow 会变成无样式裸文本。远程组件本体不会
 *   出现在 light DOM，故不构成泄漏面；
 * - 宿主元素（wrapper）为 `display:contents`：不给宿主引入额外盒子，shadow 内容按宿主父级
 *   排版（例如父级是居中 flex 容器时，远程按钮就是该容器的 flex item，与 <HubRemote> 布局等价）。
 */

import {
  Teleport,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Component,
  type PropType,
  type Slot,
  type VNodeChild,
} from 'vue'

import { loadRemote, type ResolvedPkg } from './loader'

export const HubRemoteShadow = defineComponent({
  name: 'HubRemoteShadow',
  // attrs 全部透传给 shadow 内的远程组件，不落到宿主 wrapper
  inheritAttrs: false,
  props: {
    /** 远程包：moduleUrl 字符串或 { moduleUrl, cssUrls?, peer? }。 */
    pkg: { type: [String, Object] as PropType<string | ResolvedPkg>, required: true },
  },
  setup(props, { attrs, slots }) {
    const hostEl = ref<HTMLElement | null>(null)
    const shadowRoot = shallowRef<ShadowRoot | null>(null)
    /** shadow 内承载远程组件的容器（Teleport 目标）。 */
    const viewEl = shallowRef<HTMLElement | null>(null)
    const state = shallowRef<'loading' | 'error' | 'ready'>('loading')
    const errorMsg = shallowRef('')
    const resolved = shallowRef<Component | null>(null)
    let gen = 0

    onMounted(() => {
      const host = hostEl.value
      if (!host) return
      const root = host.attachShadow({ mode: 'open' })
      const view = document.createElement('div')
      // 与宿主 wrapper 同样透明，避免给远程组件套一层会改变排版语义的盒子
      view.style.display = 'contents'
      // <slot> 投射 light DOM 里的 loading/error 插槽（保持宿主样式生效）
      root.append(view, document.createElement('slot'))
      shadowRoot.value = root
      viewEl.value = view
    })

    /** activate 由 setup 阶段的 immediate watch 触发，此时尚未挂载 —— 等一帧取 shadow root。 */
    async function shadowTarget(): Promise<ShadowRoot> {
      if (shadowRoot.value) return shadowRoot.value
      await nextTick()
      const root = shadowRoot.value
      if (!root) throw new Error('<HubRemoteShadow> 未挂载 shadow root（需要浏览器环境）')
      return root
    }

    async function activate(): Promise<void> {
      const cur = ++gen
      state.value = 'loading'
      try {
        const root = await shadowTarget()
        const comp = await loadRemote(props.pkg, { cssRoot: root })
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

    return (): VNodeChild => {
      const view = viewEl.value
      let children: VNodeChild
      if (state.value === 'ready' && resolved.value && view) {
        const forwarded: Record<string, Slot> = {}
        for (const key of Object.keys(slots)) {
          if ((key === 'loading' || key === 'error') || !slots[key]) continue
          forwarded[key] = slots[key]!
        }
        children = [h(Teleport, { to: view }, [h(resolved.value, { ...attrs }, forwarded)])]
      } else if (state.value === 'error' && slots.error) {
        children = [slots.error({ message: errorMsg.value, retry: activate })]
      } else if (state.value === 'loading' && slots.loading) {
        children = [slots.loading({})]
      } else {
        children = [h('span')]
      }
      return h('div', { ref: hostEl, style: { display: 'contents' } }, children)
    }
  },
})

export default HubRemoteShadow
