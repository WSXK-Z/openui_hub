<script lang="ts">
import { computed, createTextVNode, defineComponent, h, inject } from 'vue'
import type { PropType } from 'vue'
import type { DsNode } from '../types'
import { evalCondition } from '../runtime/condition'
import { DsContextKey, useFieldValue } from '../runtime/context'
import { useFieldOptions } from '../composables/useFieldOptions'
import { normalizeStyle, toCssVars } from '../runtime/style'

/**
 * DsControl —— 渲染一个 schema 节点的「元素本体」（不包含外层字段布局）。
 *
 * 职责（数据驱动核心）：
 * - 按 registry 解析 `component`；
 * - @dp_ui/core 契约：schema.style → `theme` prop、schema.props → `comp` prop；
 *   原生契约：schema.props 直接透传 + class/style/cssVars 合并；
 * - 字段（node.field）绑定 model 值（v-model 语义）；
 * - 数据源选项注入到 options（键见 optionsKey）；
 * - disabled / 事件（on*）按条件处理。
 */
export default defineComponent({
  name: 'DsControl',
  props: {
    node: { type: Object as PropType<DsNode>, required: true },
  },
  setup(props, { slots }) {
    const ctx = inject(DsContextKey)
    if (!ctx) {
      throw new Error('[@dp_ui/schema] <DsControl> 必须在 <DsSchema>/<DsForm> 内使用')
    }

    const entry = computed(() => ctx.registry.get(props.node.component))
    const valueType = computed(
      () => props.node.valueType ?? entry.value?.valueType ?? 'string',
    )
    const value = props.node.field
      ? useFieldValue(ctx.model, props.node.field, {
        valueType: valueType.value,
        fallbackValue: props.node.fallbackValue,
      })
      : undefined

    // 数据源：为选择类组件注入 options
    const { hasSource, options } = useFieldOptions(props.node, ctx)

    const disabled = computed(() => evalCondition(props.node.disabled, { model: ctx.model }, false))

    // 拆分 props：on* 事件与普通数据
    const splitProps = computed(() => {
      const raw = props.node.props ?? {}
      const listeners: Record<string, unknown> = {}
      const data: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(raw)) {
        if (key.startsWith('on')) listeners[key] = val
        else data[key] = val
      }
      return { listeners, data }
    })

    const normalized = computed(() => normalizeStyle(props.node.style))

    /** 组装最终 vnode props */
    function buildElementProps() {
      const e = entry.value
      if (!e) return {}
      const isDp = e.contract !== 'native'
      const { listeners, data } = splitProps.value
      const out: Record<string, unknown> = { ...listeners }

      if (isDp) {
        // @dp_ui/core 契约：theme + comp（原生 style/class 由使用者透传）
        out.theme = { ...normalized.value.themeProps }
        const comp: Record<string, unknown> = { ...data }
        const optionsKey = props.node.dataSource?.optionsKey ?? e.optionsKey ?? 'options'
        if (hasSource.value) comp[optionsKey] = options.value
        if (disabled.value) comp.disabled = true
        out.comp = comp
      } else {
        // 原生契约：props 直接透传，样式合并进 class/style/cssVars
        for (const [key, val] of Object.entries(data)) out[key] = val
        if (hasSource.value) {
          const optionsKey = props.node.dataSource?.optionsKey ?? e.optionsKey ?? 'options'
          out[optionsKey] = options.value
        }
        if (disabled.value) out.disabled = true
        const n = normalized.value
        if (n.themeProps.class) out.class = n.themeProps.class
        const mergedStyle: Record<string, unknown> = {}
        if (n.themeProps.style && typeof n.themeProps.style === 'object') {
          Object.assign(mergedStyle, n.themeProps.style)
        }
        Object.assign(mergedStyle, toCssVars(n.themeProps.cssVars as Record<string, string | number> | undefined))
        if (Object.keys(mergedStyle).length > 0) out.style = mergedStyle
      }

      if (value) {
        out.modelValue = value.value
        out['onUpdate:modelValue'] = (next: unknown) => {
          value.value = next
        }
      }
      return out
    }

    function renderChildren() {
      return slots.default?.() ?? []
    }

    return () => {
      const e = entry.value
      if (!e) {
        // 未注册组件：给出可读提示（v0 兜底）
        return h(
          'span',
          {
            class: 'ds-unknown',
            style: { color: 'var(--dp-color-danger, #ef4444)', fontSize: '12px' },
          },
          `[@dp_ui/schema] 未注册的组件类型: ${props.node.component}`,
        )
      }
      const hasChildren = Boolean(props.node.children?.length)
      const hasText = props.node.text !== undefined
      if (hasChildren || hasText) {
        return h(
          e.component,
          buildElementProps(),
          {
            default: hasText
              ? () => [createTextVNode(props.node.text ?? '')]
              : renderChildren,
          },
        )
      }
      return h(e.component, buildElementProps())
    }
  },
})
</script>
