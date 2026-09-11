<script lang="ts">
import { computed, defineComponent, h, inject } from 'vue'
import type { PropType, VNode } from 'vue'
import type { DsNode as DsSchemaNode } from '../types'
import { evalCondition } from '../runtime/condition'
import { DsContextKey } from '../runtime/context'
import DsControl from './DsControl.vue'

/**
 * DsNode —— 递归渲染单个 schema 节点。
 *
 * 分支逻辑：
 * - `visible` 为假 → 不渲染；
 * - 字段（有 field 且无 children）→ 外层字段布局：label + 控件 + help + error；
 * - 容器（有 children）→ 直接渲染元素，children 作为默认插槽递归渲染为 DsNode；
 * - 其余 → 直接渲染元素（展示组件）。
 */
function createDsNodeComponent() {
  const DsNode = defineComponent({
    name: 'DsNode',
    props: {
      node: { type: Object as PropType<DsSchemaNode>, required: true },
    },
    setup(props) {
      const ctx = inject(DsContextKey)
      if (!ctx) {
        throw new Error('[@dp_ui/schema] <DsNode> 必须在 <DsSchema>/<DsForm> 内使用')
      }

      const visible = computed(() => evalCondition(props.node.visible, { model: ctx.model }))
      const error = computed(() => (props.node.field ? ctx.errors[props.node.field] : undefined))
      const isField = computed(() => Boolean(props.node.field) && !props.node.children?.length)

      const fieldStyle = computed(() => {
        const span = props.node.style?.span
        return span && span > 1 ? { gridColumn: `span ${span}` } : undefined
      })

      /** 字段布局 vnode */
      function renderField() {
        const n = props.node
        const parts: VNode[] = []
        if (n.label) {
          const labelChildren: Array<VNode | string> = [n.label]
          if (n.rules?.some((r) => r.required)) {
            labelChildren.push(h('span', { class: 'ds-field__required' }, ' *'))
          }
          parts.push(h('label', { class: 'ds-field__label' }, labelChildren))
        }
        parts.push(h(DsControl, { node: n }))
        if (n.help) parts.push(h('div', { class: 'ds-field__help' }, n.help))
        if (error.value) parts.push(h('div', { class: 'ds-field__error' }, error.value))
        return h('div', { class: 'ds-field', style: fieldStyle.value }, parts)
      }

      return () => {
        if (!visible.value) return null
        const n = props.node
        if (isField.value) return renderField()
        // 容器：children 递归渲染（闭包引用 DsNode 自身，实现任意深度递归）
        const children = (n.children ?? []).map((child, index) =>
          h(DsNode, { node: child, key: child.key ?? index }),
        )
        return h(DsControl, { node: n }, { default: () => children })
      }
    },
  })
  return DsNode
}

export default createDsNodeComponent()
</script>

<style>
.ds-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ds-field__label {
  font-size: 13px;
  color: var(--dp-color-text-secondary, #6b7280);
}

.ds-field__required {
  color: var(--dp-color-danger, #ef4444);
  margin-left: 2px;
}

.ds-field__help {
  font-size: 12px;
  color: var(--dp-color-text-secondary, #6b7280);
}

.ds-field__error {
  font-size: 12px;
  color: var(--dp-color-danger, #ef4444);
}
</style>
