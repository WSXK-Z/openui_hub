import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 按给定间隔逐级推进的阶段计时器。
 *
 * - `steps[i]` 为进入第 i+1 阶段的等待毫秒数，走完最后一级后停止。
 * - 组件卸载时自动清理；`enabled` 为 false 时保持在第 0 阶段。
 */
export function useSequence(steps: number[], enabled = true) {
  const stage = ref(0)
  let timer: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function schedule() {
    clear()
    if (!enabled || stage.value >= steps.length - 1) return
    timer = setTimeout(() => {
      stage.value += 1
      schedule()
    }, steps[stage.value] ?? 0)
  }

  function reset() {
    stage.value = 0
    schedule()
  }

  onMounted(schedule)
  onBeforeUnmount(clear)

  return { stage, reset, clear }
}
