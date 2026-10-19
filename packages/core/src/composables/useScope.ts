import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  defineComponent,
  isVNode,
  type Component,
  type PropType,
  type VNode,
} from 'vue'

/** 需要合并到插槽根节点的属性集合（class / style / data-* / 事件等） */
export type DpScopeAttrs = Record<string, unknown>

/**
 * 把属性合并到每个插槽根节点，不产生包裹元素。
 *
 * - 数组与 Fragment 递归展开，多根插槽的每个根节点都会合并属性
 * - 文本与注释节点无法承载属性，原样保留
 */
export function applyScopeAttrs(nodes: unknown[], attrs: DpScopeAttrs): VNode[] {
  const result: VNode[] = []
  for (const node of nodes) {
    if (Array.isArray(node)) {
      result.push(...applyScopeAttrs(node, attrs))
      continue
    }
    if (!isVNode(node)) {
      if (node !== undefined && node !== null && node !== false) result.push(node as VNode)
      continue
    }
    if (node.type === Fragment && Array.isArray(node.children)) {
      result.push(...applyScopeAttrs(node.children, attrs))
      continue
    }
    if (node.type === Comment || node.type === Text) {
      result.push(node)
      continue
    }
    result.push(cloneVNode(node, attrs, true))
  }
  return result
}

/**
 * 创建“透明作用域”渲染组件：渲染插槽内容并把 `scopeAttrs` 合并到每个根节点。
 *
 * Provider 类组件用它在不改变 DOM 层级的前提下下发 CSS 变量与 `data-*` 属性；
 * 返回的组件需要在模板中声明为默认插槽的父级：
 *
 * @example
 * const Scope = useScope()
 * return () => h(Scope, { scopeAttrs }, { default: () => children })
 */
export function useScope(name = 'DpScope'): Component {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      scopeAttrs: {
        type: Object as PropType<DpScopeAttrs>,
        required: true,
      },
    },
    setup(props, { slots }) {
      return () => applyScopeAttrs(slots.default?.() ?? [], props.scopeAttrs)
    },
  })
}
