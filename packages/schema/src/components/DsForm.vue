<script lang="ts">
import { computed, defineComponent, h, reactive, ref, toRaw } from 'vue'
import type { PropType, Ref } from 'vue'
import type { DsNode as DsSchemaNode } from '../types'
import type { DsRequest } from '../runtime/dataSource'
import { defaultRegistry, type DsRegistry } from '../types/registry'
import { provideDsContext } from '../runtime/context'
import { validateFields } from '../runtime/validate'
import DsNode from './DsNode.vue'

/**
 * DsForm —— 数据驱动表单便捷入口。
 *
 * 把一组「字段 schema」按指定列数排布并递归渲染：
 * - 字段节点通过 `field` 绑定到 model；
 * - 交互选项由 `dataSource`（静态/异步/远程/联动）提供；
 * - 校验由 `rules` 声明，`validate()` 触发并写回字段级错误。
 *
 * ```vue
 * <DsForm :model="model" :fields="fields" :columns="2" @submit="onSubmit" />
 * ```
 */
export default defineComponent({
  name: 'DsForm',
  props: {
    /** 字段节点数组（也可以是含容器的 schema，这里统一展开为可布局的字段） */
    fields: { type: Array as PropType<DsSchemaNode[]>, required: true },
    /** 绑定数据对象（建议响应式） */
    model: { type: Object as PropType<Record<string, unknown>>, required: true },
    /** 栅格列数（默认 1 = 纵向） */
    columns: { type: Number, default: 1 },
    /** 列间距 */
    gap: { type: Number, default: 16 },
    /** 自定义注册表 */
    registry: { type: Object as PropType<DsRegistry>, default: undefined },
    /** 远程请求实现 */
    request: { type: Function as PropType<DsRequest>, default: undefined },
  },
  emits: {
    submit: null,
  },
  setup(props, { expose, emit, slots }) {
    const registry = props.registry ?? defaultRegistry
    const request: DsRequest = props.request ?? defaultFetchRequest
    const errors = reactive<Record<string, string>>({})
    const modelProxy = reactive(props.model) as Record<string, unknown>
    provideDsContext({ model: modelProxy, registry, request, errors })

    const columns = computed(() => Math.max(1, Math.floor(props.columns)))

    /** 布局：多列 → CSS grid；单列 → 纵向流 */
    const wrapperStyle = computed(() => {
      if (columns.value > 1) {
        return {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
          gap: `${props.gap}px`,
        }
      }
      return { display: 'flex', flexDirection: 'column' as const, gap: `${props.gap}px` }
    })

    async function validate(): Promise<boolean> {
      const { valid, errors: result } = await validateFields(props.fields, toRaw(modelProxy))
      for (const key of Object.keys(errors)) delete errors[key]
      Object.assign(errors, result)
      return valid
    }

    function clearErrors(): void {
      for (const key of Object.keys(errors)) delete errors[key]
    }

    /** 校验通过后触发 submit */
    async function submit(): Promise<boolean> {
      const valid = await validate()
      if (valid) emit('submit', toRaw(modelProxy))
      return valid
    }

    expose({ validate, submit, clearErrors, errors: () => errors })

    return () => {
      const children = props.fields.map((node, index) =>
        h(DsNode, { node, key: node.key ?? node.field ?? `${node.component}-${index}` }),
      )
      const content = h('div', { class: 'ds-form', style: wrapperStyle.value }, children)
      if (slots.footer) {
        return h('div', { class: 'ds-form' }, [
          content,
          h('div', { class: 'ds-form__footer' }, [slots.footer({ valid: false })]),
        ])
      }
      return content
    }
  },
})

function defaultFetchRequest(url: string, init?: RequestInit): Promise<unknown> {
  if (typeof fetch !== 'function') {
    return Promise.reject(new Error('[@dp_ui/schema] 当前环境无 fetch，请通过 request prop 提供数据源实现'))
  }
  return fetch(url, init).then((res) => {
    if (!res.ok) throw new Error(`[@dp_ui/schema] HTTP ${res.status}`)
    return res.json()
  })
}
</script>
