<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSequence } from '../../composables/useSequence'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcTaskRows', inheritAttrs: false })

export interface DpcTaskDetail {
  label: string
  meta: string
}

export type DpcTaskStatus = 'done' | 'running' | 'sequence'

export interface DpcTaskRow {
  key: string
  label: string
  amount: string
  /** done 静态完成；running 静态进行中；sequence 依次经历进行中 → 失败 → 完成 */
  status: DpcTaskStatus
  /** 进行中的序号 */
  step?: number
  details: DpcTaskDetail[]
}

export interface DpcTaskRowsLabels {
  completed: string
  failed: string
}

export interface DpcTaskRowsComp {
  rows: DpcTaskRow[]
  labels: Partial<DpcTaskRowsLabels>
  /** Capsules 为独立圆角卡，List 为同一张卡内的分隔行 */
  variant: 'Capsules' | 'List'
  /** 自动播放一次状态流转 */
  autoPlay: boolean
}

export type DpcTaskRowsProps = DpcProps<DpcTaskRowsComp>

const props = defineProps<DpcTaskRowsProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcTaskRowsComp>(props, {
  compDefaults: {
    rows: [],
    labels: {},
    variant: 'Capsules',
    autoPlay: true,
  },
})

const emit = defineEmits<{
  /** 任务详情开合 */
  (e: 'toggleRow', key: string, open: boolean): void
}>()

const TICKS = [600, 900, 2400, 1400, 2400, 600]

const { stage: tick } = useSequence(TICKS, c.value.autoPlay)

const copy = computed<DpcTaskRowsLabels>(() => ({
  completed: 'Completed',
  failed: 'Failed',
  ...c.value.labels,
}))

const row2 = computed<'pending' | 'failed' | 'done'>(() =>
  tick.value < 3 ? 'pending' : tick.value === 3 ? 'failed' : 'done',
)

const list = computed(() => c.value.variant === 'List')

const manualOpen = ref<Record<string, boolean>>({})

function isOpen(row: DpcTaskRow): boolean {
  const manual = manualOpen.value[row.key]
  if (manual !== undefined) return manual
  return row.status === 'running' && tick.value === 2
}

function toggleRow(row: DpcTaskRow) {
  const next = !isOpen(row)
  manualOpen.value = { ...manualOpen.value, [row.key]: next }
  emit('toggleRow', row.key, next)
}

function rowState(
  row: DpcTaskRow,
): 'pending' | 'failed' | 'done' | 'static-done' | 'static-running' {
  if (row.status === 'done') return 'static-done'
  if (row.status === 'running') return 'static-running'
  return row2.value
}

const CIRCUMFERENCE = 2 * Math.PI * 11
const DASH = `${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE * 0.72}`

function capsuleRadius(row: DpcTaskRow) {
  if (list.value) return 0
  return isOpen(row) ? 14 : 22
}
</script>

<template>
  <div
    v-bind="rootAttrs"
    class="dpc-task-rows flex w-full max-w-110 flex-col"
    :class="
      list
        ? 'gap-0 self-start overflow-hidden rounded-[var(--dpc-radius-card)] bg-[var(--dpc-color-surface)]'
        : 'min-h-[196px] gap-2'
    "
    :style="list ? { boxShadow: 'var(--dpc-shadow-card)' } : undefined"
  >
    <div
      v-for="(row, index) in c.rows"
      :key="row.key"
      class="dpc-task-rows__item self-stretch overflow-hidden transition-colors duration-300 hover:bg-[var(--dpc-color-inset)]"
      :class="
        list
          ? 'border-b border-[var(--dpc-color-line)] last:border-0'
          : 'bg-[var(--dpc-color-surface)]'
      "
      :style="{
        borderRadius: `${capsuleRadius(row)}px`,
        boxShadow: list ? undefined : 'var(--dpc-shadow-card)',
        animation: `dpc-fade-up 450ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 80}ms both`,
      }"
    >
      <button
        type="button"
        class="flex h-11 w-full cursor-pointer items-center gap-2.5 bg-transparent px-2.5 text-left"
        :aria-expanded="isOpen(row)"
        @click="toggleRow(row)"
      >
        <span class="flex size-6 shrink-0 items-center justify-center">
          <!-- 静态完成 -->
          <span
            v-if="rowState(row) === 'static-done'"
            class="flex size-[22px] items-center justify-center rounded-full bg-[var(--dpc-color-green)] text-white"
            :style="{ animation: 'dpc-pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) both' }"
          >
            <AgentIcon name="check" :size="13" :stroke-width="3.5" />
          </span>

          <!-- 静态进行中 / 序列进行中 -->
          <span
            v-else-if="rowState(row) === 'static-running' || rowState(row) === 'pending'"
            class="relative inline-flex shrink-0 items-center justify-center"
            :style="{ width: '24px', height: '24px' }"
          >
            <svg
              width="24"
              height="24"
              class="absolute inset-0"
              :style="
                rowState(row) === 'static-running'
                  ? { animation: 'dpc-spin 1.1s linear infinite' }
                  : undefined
              "
            >
              <circle
                cx="12"
                cy="12"
                r="11"
                fill="none"
                stroke="var(--dpc-color-line)"
                stroke-width="2"
              />
              <circle
                v-if="rowState(row) === 'static-running'"
                cx="12"
                cy="12"
                r="11"
                fill="none"
                stroke="var(--dpc-color-ink-3)"
                stroke-width="2"
                stroke-linecap="round"
                :stroke-dasharray="DASH"
              />
            </svg>
            <span
              class="dpc-tabular relative text-[10.5px] font-semibold text-[var(--dpc-color-ink)]"
            >
              {{ row.step ?? '' }}
            </span>
          </span>

          <!-- 序列失败 -->
          <span
            v-else-if="rowState(row) === 'failed'"
            class="flex size-[22px] items-center justify-center rounded-full bg-[var(--dpc-color-red)] text-white"
            :style="{ animation: 'dpc-pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) both' }"
          >
            <AgentIcon name="close" :size="12" :stroke-width="3.5" />
          </span>

          <!-- 序列完成 -->
          <span
            v-else
            class="flex size-[22px] items-center justify-center rounded-full bg-[var(--dpc-color-green)] text-white"
            :style="{ animation: 'dpc-pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) both' }"
          >
            <AgentIcon name="check" :size="13" :stroke-width="3.5" />
          </span>
        </span>

        <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--dpc-color-ink)]">
          {{ row.label }}
        </span>

        <span class="dpc-tabular text-[12.5px] text-[var(--dpc-color-ink-2)]">{{
          row.amount
        }}</span>

        <span
          v-if="rowState(row) === 'static-done'"
          class="inline-flex h-[22px] items-center rounded-full bg-[var(--dpc-color-green-tint)] px-2 text-[11.5px] font-medium text-[var(--dpc-color-green)]"
        >
          {{ copy.completed }}
        </span>
        <span
          v-else-if="rowState(row) === 'failed'"
          class="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--dpc-color-red-tint)] px-2 text-[11.5px] font-medium text-[var(--dpc-color-red)]"
          :style="{ animation: 'dpc-fade-in 200ms ease-out both' }"
        >
          {{ copy.failed }}
          <span class="flex" :style="{ animation: 'dpc-spin 1.2s linear infinite' }">
            <AgentIcon name="retry" :size="12" :stroke-width="3" />
          </span>
        </span>
        <span
          v-else-if="rowState(row) === 'done'"
          class="inline-flex h-[22px] items-center rounded-full bg-[var(--dpc-color-green-tint)] px-2 text-[11.5px] font-medium text-[var(--dpc-color-green)]"
          :style="{ animation: 'dpc-fade-in 200ms ease-out both' }"
        >
          {{ copy.completed }}
        </span>
      </button>

      <div
        class="grid"
        :style="{
          gridTemplateRows: isOpen(row) ? '1fr' : '0fr',
          opacity: isOpen(row) ? 1 : 0,
          transition:
            'grid-template-rows 320ms cubic-bezier(0.23, 1, 0.32, 1), opacity 320ms cubic-bezier(0.23, 1, 0.32, 1)',
        }"
      >
        <div class="min-h-0 overflow-hidden">
          <div class="flex flex-col gap-1 px-2.5 pb-2.5 pl-[46px]">
            <div
              v-for="detail in row.details"
              :key="detail.label"
              class="flex items-center gap-2 text-[12px]"
            >
              <span class="min-w-0 flex-1 truncate text-[var(--dpc-color-ink-2)]">{{
                detail.label
              }}</span>
              <span
                class="dpc-mono dpc-tabular shrink-0 text-[11.5px] text-[var(--dpc-color-ink-3)]"
              >
                {{ detail.meta }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
