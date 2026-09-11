import { computed, onScopeDispose, ref, watch } from 'vue'
import type { DsNode, DsOption } from '../types'
import { buildOptionsLoader, type DsRequest } from '../runtime/dataSource'
import { getPath } from '../runtime/path'

/**
 * 加载字段的交互数据（选项）：
 * - 数据源为静态/惰性函数/远程；`dependsOn` 依赖字段变化时自动重新加载；
 * - 暴露 options / loading / hasSource，供渲染层注入组件。
 */
export function useFieldOptions(
  node: DsNode,
  ctx: { model: Record<string, unknown>; request: DsRequest },
) {
  const hasSource = computed(() => Boolean(node.dataSource?.options !== undefined || node.dataSource?.remote))
  const options = ref<DsOption[]>([])
  const loading = ref(false)
  const error = ref<unknown>(undefined)

  let cancelled = false
  const cancelToken = () => {
    cancelled = true
  }
  onScopeDispose(cancelToken)

  async function load(): Promise<void> {
    if (!hasSource.value) {
      options.value = []
      return
    }
    // 静态数组：同步填充，避免无谓异步抖动
    if (Array.isArray(node.dataSource?.options)) {
      options.value = node.dataSource?.options as DsOption[]
      return
    }
    loading.value = true
    error.value = undefined
    const loader = buildOptionsLoader(node.dataSource, { model: ctx.model }, ctx.request)
    if (!loader) {
      loading.value = false
      return
    }
    try {
      const data = await loader()
      if (!cancelled) options.value = data
    } catch (e) {
      if (!cancelled) error.value = e
    } finally {
      if (!cancelled) loading.value = false
    }
  }

  // 依赖字段变化 → 重新加载（级联）
  const depends = computed(() => (node.dataSource?.dependsOn ?? []).map((p) => getPath(ctx.model, p)))
  watch(depends, () => {
    void load()
  })

  if ((node.dataSource?.immediate ?? true) === true) {
    void load()
  }

  return { hasSource, options, loading, error, reload: load }
}
