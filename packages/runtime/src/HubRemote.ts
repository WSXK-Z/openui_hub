/**
 * <HubRemote> —— 声明式运行时远程组件（默认样式隔离）。
 *
 * ```vue
 * <!-- 给 hub 地址 + 包名（版本可省，省则取 hub 上最新版本） -->
 * <HubRemote registry="http://127.0.0.1:8787" name="@test/button" version="0.1.2" variant="primary" @click="onClick">保存</HubRemote>
 * <!-- 已自行拿到产物地址时直接给 pkg -->
 * <HubRemote pkg="https://hub.example.com/v/@test/button@0.1.2/dist/button.mjs" />
 * <!-- 关掉隔离：远程样式进 document.head、远程组件渲染在宿主位置 -->
 * <HubRemote :isolate="false" registry="http://127.0.0.1:8787" name="@test/button" />
 * ```
 *
 * 隔离（`isolate`，默认开）—— 渲染边界是本组件挂载的 shadow root：
 * - 远程 `cssUrls` 注入该 shadow（不落 `document.head`），远程组件也渲染在 shadow 内 ——
 *   发布包里的 `!important` 全局规则（`article{height:auto}`、`.grid{display:block}` …）
 *   无法命中宿主页面，宿主样式也不进入 shadow；
 * - 隔离的是样式，不是脚本：远程模块与宿主同 realm（同 window、同一份全局对象与 storage），
 *   只处在自己的模块作用域里；
 * - loading/error 插槽内容仍渲染在 **light DOM**（经 shadow 内的 `<slot>` 投射），因为宿主页面的
 *   样式（UnoCSS 等）只作用于 light DOM —— 放进 shadow 会变成无样式裸文本；远程组件本体不会
 *   出现在 light DOM，故不构成泄漏面；
 * - shadow 宿主元素为 `display:contents`：不引入额外盒子，shadow 内容按宿主父级排版
 *   （例如父级是居中 flex 容器时，远程按钮就是该容器的 flex item）；
 * - 关掉隔离时样式进 `document.head`（全局生效），远程组件直接渲染在宿主位置。
 *
 * - attrs（含事件/未声明 prop）与 slots（除保留名 loading/error）全部透传给远程组件；
 * - loading/error 插槽控制加载与失败态；error 插槽参数 { message, retry }；
 * - registry/name/version/pkg/isolate 任一变化即重新加载（竞态由内部代际号丢弃过期结果）。
 */

import {
  Teleport,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  type Component,
  type Slot,
  type VNodeChild,
} from 'vue'

import { loadRemote } from './loader'
import { remoteProps, resolveRemoteTarget } from './remoteProps'

const STATE_SLOT_KEYS = new Set(['loading', 'error'])

export const HubRemote = defineComponent({
  name: 'HubRemote',
  // attrs 全部透传给远程组件，不落到本组件的渲染根 / shadow 宿主
  inheritAttrs: false,
  props: {
    ...remoteProps,
    /** 样式隔离：远程样式与组件进 shadow DOM（默认开）；关掉则样式进 document.head、组件渲染在 light DOM。 */
    isolate: { type: Boolean, default: true },
  },
  setup(props, { attrs, slots }) {
    const state = shallowRef<'loading' | 'error' | 'ready'>('loading')
    const errorMsg = shallowRef('')
    const resolved = shallowRef<Component | null>(null)
    /** shadow 宿主元素（隔离时的渲染根）。 */
    const hostEl = ref<HTMLElement | null>(null)
    const shadowRoot = shallowRef<ShadowRoot | null>(null)
    /** shadow 内承载远程组件的容器（Teleport 目标）。 */
    const viewEl = shallowRef<HTMLElement | null>(null)
    let gen = 0

    /** 宿主元素到位后建 shadow（从 ref 回调调用，首次挂载与 isolate 开关都覆盖）。 */
    function attachShadow(): void {
      const host = hostEl.value
      if (!host || shadowRoot.value) return
      const root = host.attachShadow({ mode: 'open' })
      const view = document.createElement('div')
      // 与宿主 wrapper 同样透明，避免给远程组件套一层会改变排版语义的盒子
      view.style.display = 'contents'
      // <slot> 投射 light DOM 里的 loading/error 插槽（保持宿主样式生效）
      root.append(view, document.createElement('slot'))
      shadowRoot.value = root
      viewEl.value = view
    }

    /** 远程样式注入目标（等一帧等宿主挂载）；关掉隔离时返回 null，样式落 document.head。 */
    async function cssTarget(): Promise<ShadowRoot | null> {
      if (!props.isolate) return null
      if (!shadowRoot.value) await nextTick()
      const root = shadowRoot.value
      if (!root) throw new Error('<HubRemote> 开启 isolate 需要浏览器环境（未挂载 shadow root）')
      return root
    }

    async function activate(): Promise<void> {
      const cur = ++gen
      state.value = 'loading'
      try {
        const cssRoot = await cssTarget()
        const comp = await loadRemote(await resolveRemoteTarget(props), { cssRoot })
        if (cur !== gen) return // 过期结果：定位参数已切换或已卸载
        resolved.value = comp
        state.value = 'ready'
      } catch (e) {
        if (cur !== gen) return
        errorMsg.value = e instanceof Error ? e.message : String(e)
        state.value = 'error'
      }
    }

    watch(
      [
        () => props.pkg,
        () => props.registry,
        () => props.name,
        () => props.version,
        () => props.isolate,
      ],
      activate,
      { immediate: true },
    )
    onBeforeUnmount(() => {
      gen++
    })

    /** 除保留名 loading/error 以外，全部 slot 透传给远程组件。 */
    function forwardedSlots(): Record<string, Slot> {
      const forwarded: Record<string, Slot> = {}
      for (const key of Object.keys(slots)) {
        if (STATE_SLOT_KEYS.has(key) || !slots[key]) continue
        forwarded[key] = slots[key]!
      }
      return forwarded
    }

    /** 未就绪时的内容：error/loading 插槽，都没有时退化为空 span。 */
    function pending(): VNodeChild {
      if (state.value === 'error' && slots.error) {
        return slots.error({ message: errorMsg.value, retry: activate })
      }
      if (state.value === 'loading' && slots.loading) {
        return slots.loading({})
      }
      return h('span', null)
    }

    return (): VNodeChild => {
      const comp = state.value === 'ready' ? resolved.value : null
      if (!props.isolate) {
        return comp ? h(comp, { ...attrs }, forwardedSlots()) : pending()
      }
      const view = viewEl.value
      return h(
        'div',
        {
          ref: (el: unknown) => {
            const host = (el as HTMLElement | null) ?? null
            if (host !== hostEl.value) {
              // 宿主元素换人（首次挂载 / isolate 开关）：shadow 与投射容器随之重建
              hostEl.value = host
              shadowRoot.value = null
              viewEl.value = null
            }
            attachShadow()
          },
          style: { display: 'contents' },
        },
        [comp && view ? h(Teleport, { to: view }, [h(comp, { ...attrs }, forwardedSlots())]) : pending()],
      )
    }
  },
})

export default HubRemote
