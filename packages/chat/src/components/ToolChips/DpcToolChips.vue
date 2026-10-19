<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcToolChips', inheritAttrs: false })

export interface DpcToolDetailLine {
  text: string
  /** add 行使用绿色 */
  tone?: 'add'
}

export interface DpcToolStep {
  /** 行首图标：think / write / run / read */
  icon: string
  /** 行主文案（如 `Write 204 lines`） */
  label: string
  /** 灰色胶囊里的参数（文件名、命令） */
  chip: string
  /** 胶囊使用等宽字体 */
  mono?: boolean
  /** 明细行使用等宽字体 */
  detailMono?: boolean
  /** 展开后的明细 */
  detail: DpcToolDetailLine[]
}

export interface DpcToolDiff {
  file: string
  add: number
  del: number
}

export interface DpcToolDiffLine {
  text: string
  tone: 'add' | 'del' | 'ctx'
}

export interface DpcToolChipsLabels {
  /** 折叠态标题（工具调用统计） */
  header: string
  /** 追加文件的链接文案 */
  more: string
}

export interface DpcToolChipsComp {
  steps: DpcToolStep[]
  diffs: DpcToolDiff[]
  /** 每个文件的 diff 行，悬停文件胶囊时展示 */
  diffLines: Record<string, DpcToolDiffLine[]>
  labels: Partial<DpcToolChipsLabels>
  /** 自动逐行揭示 */
  autoPlay: boolean
}

export type DpcToolChipsProps = DpcProps<DpcToolChipsComp>

const props = defineProps<DpcToolChipsProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcToolChipsComp>(props, {
  compDefaults: {
    steps: [],
    diffs: [],
    diffLines: {},
    labels: {},
    autoPlay: true,
  },
})

const emit = defineEmits<{
  /** 折叠面板开合 */
  (e: 'openChange', open: boolean): void
  /** 单行明细开合 */
  (e: 'toggleRow', label: string, open: boolean): void
}>()

const STEP_MS = 700

const copy = computed<DpcToolChipsLabels>(() => ({
  header: `${c.value.steps.length} tool calls`,
  more: 'More',
  ...c.value.labels,
}))

const open = ref(true)
const openRows = ref<string[]>([])
const previewFile = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null

const total = computed(() => c.value.steps.length + 1)
/** 关闭自动播放时直接展示全部行 */
const revealed = ref(c.value.autoPlay ? 0 : total.value)

function schedule() {
  if (!c.value.autoPlay) {
    revealed.value = total.value
    return
  }
  if (revealed.value >= total.value) return
  timer = setTimeout(() => {
    revealed.value += 1
    schedule()
  }, STEP_MS)
}

onMounted(schedule)
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

function toggleOpen() {
  open.value = !open.value
  emit('openChange', open.value)
}

function isRowOpen(label: string) {
  return openRows.value.includes(label)
}

function toggleRow(label: string) {
  openRows.value = isRowOpen(label)
    ? openRows.value.filter((item) => item !== label)
    : [...openRows.value, label]
  emit('toggleRow', label, isRowOpen(label))
}

function preview(file: string | null) {
  previewFile.value = file
}

function previewLines(file: string): DpcToolDiffLine[] {
  return c.value.diffLines[file] ?? []
}

function diffAdd(file: string): number {
  return c.value.diffs.find((item) => item.file === file)?.add ?? 0
}

function diffDel(file: string): number {
  return c.value.diffs.find((item) => item.file === file)?.del ?? 0
}

function lineToneClass(tone: DpcToolDiffLine['tone']) {
  if (tone === 'add') return 'bg-[var(--dpc-color-green-tint)] text-[var(--dpc-color-green)]'
  if (tone === 'del') return 'bg-[var(--dpc-color-red-tint)] text-[var(--dpc-color-red)]'
  return 'text-[var(--dpc-color-ink-2)]'
}
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-tool-chips min-h-[220px] w-full max-w-80 pb-1">
    <!-- 折叠态标题 -->
    <button
      type="button"
      class="dpc-tool-chips__header -mx-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-[var(--dpc-radius-control)] bg-transparent px-1.5 py-1 text-[12.5px] text-[var(--dpc-color-ink-2)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)]"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <AgentIcon
        name="chevron-down"
        :size="12"
        :stroke-width="2.2"
        class="transition-transform duration-200"
        :style="{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }"
      />
      <span class="dpc-tabular">{{ copy.header }}</span>
    </button>

    <div
      class="grid"
      :style="{
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transition: 'grid-template-rows 300ms ease, opacity 300ms ease',
      }"
    >
      <div class="-mx-1 overflow-hidden px-1.5 pb-1">
        <div class="mt-1.5 flex flex-col gap-1">
          <div
            v-for="row in c.steps.slice(0, revealed)"
            :key="row.label"
            :style="{ animation: 'dpc-fade-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both' }"
          >
            <button
              type="button"
              class="dpc-tool-chips__row group -mx-[3px] flex h-7 min-w-0 cursor-pointer items-center gap-2 rounded-[var(--dpc-radius-control)] bg-transparent px-[3px] text-left transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)]"
              :style="{ width: 'calc(100% + 6px)' }"
              :aria-expanded="isRowOpen(row.label)"
              @click="toggleRow(row.label)"
            >
              <span
                class="relative flex size-4 shrink-0 items-center justify-center text-[var(--dpc-color-ink-3)]"
              >
                <AgentIcon
                  :name="row.icon"
                  :size="13"
                  class="transition-opacity duration-100"
                  :class="isRowOpen(row.label) ? 'opacity-0' : 'group-hover:opacity-0'"
                />
                <AgentIcon
                  name="chevron-down"
                  :size="12"
                  :stroke-width="2.2"
                  class="absolute transition-all duration-150"
                  :class="
                    isRowOpen(row.label) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  "
                  :style="{ transform: isRowOpen(row.label) ? 'rotate(0deg)' : 'rotate(-90deg)' }"
                />
              </span>

              <span
                class="dpc-tool-chips__label shrink-0 text-[12.5px] font-medium text-[var(--dpc-color-ink)]"
              >
                {{ row.label }}
              </span>

              <span
                class="inline-flex h-[22px] min-w-0 flex-1 items-center truncate rounded-[var(--dpc-radius-chip)] bg-[var(--dpc-color-field)] px-1.5 text-[11.5px] text-[var(--dpc-color-ink-2)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)]"
                :class="{ 'dpc-mono': row.mono }"
                :style="{ boxShadow: 'var(--dpc-shadow-hairline)' }"
              >
                {{ row.chip }}
              </span>
            </button>

            <div
              class="grid"
              :style="{
                gridTemplateRows: isRowOpen(row.label) ? '1fr' : '0fr',
                opacity: isRowOpen(row.label) ? 1 : 0,
                transition:
                  'grid-template-rows 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms cubic-bezier(0.23, 1, 0.32, 1)',
              }"
            >
              <div class="min-h-0 overflow-hidden">
                <div
                  class="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-[var(--dpc-color-line)] py-0.5 pl-3.5"
                >
                  <span
                    v-for="line in row.detail"
                    :key="line.text"
                    class="truncate text-[11.5px] leading-[1.6]"
                    :class="[
                      row.detailMono ? 'dpc-mono' : '',
                      line.tone === 'add'
                        ? 'text-[var(--dpc-color-green)]'
                        : 'text-[var(--dpc-color-ink-2)]',
                    ]"
                  >
                    {{ line.text }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 文件 diff 胶囊 -->
        <div
          v-if="revealed >= total"
          class="mt-2.5 flex max-w-full flex-wrap gap-1.5 border-t border-[var(--dpc-color-line)] pt-2.5"
        >
          <span
            v-for="(diff, index) in c.diffs"
            :key="diff.file"
            class="relative"
            @mouseenter="preview(diff.file)"
            @mouseleave="preview(null)"
            @focusin="preview(diff.file)"
            @focusout="preview(null)"
          >
            <button
              type="button"
              class="inline-flex h-7 max-w-full cursor-pointer items-center gap-2 rounded-[var(--dpc-radius-chip)] bg-[var(--dpc-color-surface)] px-2 text-[11.5px] text-[var(--dpc-color-ink)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover)]"
              :style="{
                boxShadow: 'var(--dpc-shadow-btn)',
                animation: `dpc-pop-in 250ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 80}ms both`,
              }"
              :aria-expanded="previewFile === diff.file"
              :aria-label="`Show diff for ${diff.file}`"
            >
              <span class="dpc-mono min-w-0 truncate">{{ diff.file }}</span>
              <span class="dpc-tabular shrink-0 text-[var(--dpc-color-green)]"
                >+{{ diff.add }}</span
              >
              <span v-if="diff.del > 0" class="dpc-tabular shrink-0 text-[var(--dpc-color-red)]">
                −{{ diff.del }}
              </span>
            </button>

            <div
              v-if="previewFile === diff.file"
              class="absolute bottom-full left-0 z-50 mb-1.5 w-72 overflow-hidden rounded-[10px] bg-[var(--dpc-color-surface)]"
              :style="{
                boxShadow: 'var(--dpc-shadow-overlay)',
                animation: 'dpc-pop-in 160ms cubic-bezier(0.23, 1, 0.32, 1) both',
                transformOrigin: 'bottom left',
              }"
            >
              <div
                class="flex items-center justify-between border-b border-[var(--dpc-color-line)] px-2.5 py-1.5 text-[11px]"
              >
                <span class="dpc-mono min-w-0 truncate text-[var(--dpc-color-ink-2)]">{{
                  diff.file
                }}</span>
                <span class="dpc-tabular shrink-0">
                  <span class="text-[var(--dpc-color-green)]">+{{ diffAdd(diff.file) }}</span>
                  <span v-if="diffDel(diff.file) > 0" class="ml-1 text-[var(--dpc-color-red)]">
                    −{{ diffDel(diff.file) }}
                  </span>
                </span>
              </div>
              <div class="py-1 text-[11px] leading-[1.8]">
                <div
                  v-for="(line, lineIndex) in previewLines(diff.file)"
                  :key="lineIndex"
                  class="dpc-mono flex gap-2 px-2.5 whitespace-pre"
                  :class="lineToneClass(line.tone)"
                >
                  <span class="w-3 shrink-0 select-none">
                    {{ line.tone === 'add' ? '+' : line.tone === 'del' ? '−' : ' ' }}
                  </span>
                  <span class="min-w-0 truncate">{{ line.text }}</span>
                </div>
              </div>
            </div>
          </span>

          <button
            type="button"
            class="dpc-mono inline-flex h-7 cursor-pointer items-center rounded-[var(--dpc-radius-chip)] bg-transparent px-1.5 text-[11.5px] text-[var(--dpc-color-ink-3)] underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:text-[var(--dpc-color-ink-2)]"
            :style="{ animation: `dpc-fade-in 300ms ease-out ${c.diffs.length * 80}ms both` }"
          >
            {{ copy.more }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
