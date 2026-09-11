<script lang="ts">
import { defineComponent, h, reactive, toRaw } from 'vue'
import type { PropType } from 'vue'
import type { DsNode as DsSchemaNode, DsSchemaInput } from '../types'
import type { DsRequest } from '../runtime/dataSource'
import { defaultRegistry, type DsRegistry } from '../types/registry'
import { provideDsContext } from '../runtime/context'
import { validateFields } from '../runtime/validate'
import DsNode from './DsNode.vue'

/**
 * DsSchema —— 数据驱动渲染引擎根组件。
 *
 * 用法：
 * ```vue
 * <DsSchema :model="model" :schema="schema" />
 * ```
 *
 * 职责：
 * - provide 渲染上下文（model / registry / request / errors）；
 * - 遍历 schema 节点树递归渲染（schema 本身是响应式 prop，变更即重渲染）；
 * - 暴露 validate() 做整表校验并写回 errors（字段级展示）。
 */
export default defineComponent({
  name: 'DsSchema',
  props: {
    schema: { type: [Object, Array] as PropType<DsSchemaInput>, required: true },
    /** 绑定数据对象（建议为响应式对象，schema 字段写回这里） */
    model: { type: Object as PropType<Record<string, unknown>>, required: true },
    /** 自定义注册表（默认使用 defaultRegistry） */
    registry: { type: Object as PropType<DsRegistry>, default: undefined },
    /** 远程数据源请求实现（默认 fetch） */
    request: { type: Function as PropType<DsRequest>, default: undefined },
  },
  setup(props, { expose }) {
    const registry = props.registry ?? defaultRegistry
    const request: DsRequest = props.request ?? defaultRequest
    // model 归一化为响应式对象（嵌套 path 写入可追踪）
    const modelProxy = reactive(props.model) as Record<string, unknown>
    const errors = reactive<Record<string, string>>({})

    provideDsContext({ model: modelProxy, registry, request, errors })

    /** 触发整表校验；返回是否通过；错误写入 errors（由 DsNode 字段级展示） */
    async function validate(): Promise<boolean> {
      const { valid, errors: result } = await validateFields(currentNodes(), toRaw(modelProxy))
      for (const key of Object.keys(errors)) delete errors[key]
      Object.assign(errors, result)
      return valid
    }

    function clearErrors(): void {
      for (const key of Object.keys(errors)) delete errors[key]
    }

    function currentNodes(): DsSchemaNode[] {
      return normalizeInput(props.schema)
    }

    expose({ validate, clearErrors })

    return () => {
      const children = currentNodes().map((node, index) =>
        h(DsNode, { node, key: node.key ?? node.field ?? `${node.component}-${index}` }),
      )
      return h('div', { class: 'ds-schema' }, children)
    }
  },
})

function normalizeInput(input: DsSchemaInput): DsSchemaNode[] {
  return Array.isArray(input) ? input : [input]
}

/** 默认远程请求（fetch 风格）；jsdom/非浏览器环境无 fetch 时抛错由调用方捕获 */
function defaultRequest(url: string, init?: RequestInit): Promise<unknown> {
  if (typeof fetch !== 'function') {
    return Promise.reject(new Error('[@dp_ui/schema] 当前环境无 fetch，请通过 request prop 提供数据源实现'))
  }
  return fetch(url, init).then((res) => {
    if (!res.ok) throw new Error(`[@dp_ui/schema] HTTP ${res.status}`)
    return res.json()
  })
}
</script>
