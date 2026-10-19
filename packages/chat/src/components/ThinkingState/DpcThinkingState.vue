<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSequence } from '../../composables/useSequence'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcThinkingState', inheritAttrs: false })

export type DpcThinkingVariant = 'Steps' | 'Reasoning' | 'Search' | 'Coding'

export interface DpcThinkingRow {
  /** 行主文案：步骤名、推理句、搜索结果标题或工具名 */
  primary: string
  /** 行尾补充信息：数量、域名、文件名 */
  secondary?: string
  /** 补充信息使用等宽字体 */
  mono?: boolean
  /** 新增行数（Coding 变体） */
  add?: number
  /** 删除行数（Coding 变体） */
  del?: number
  /** 搜索结果链接（Search 变体） */
  href?: string
}

export interface DpcThinkingStateComp {
  /** 追踪样式：步骤 / 推理 / 联网搜索 / 工具调用 */
  variant: DpcThinkingVariant
  /** 进行中的文案，留空时按变体取默认值 */
  active: string
  /** 完成后的文案，留空时按变体取默认值 */
  done: string
  /** 搜索变体显示在行首的查询词 */
  query: string
  /** 追踪行；不传时该变体只有标题行 */
  rows: DpcThinkingRow[]
  /** 自动播放一次追踪动画 */
  autoPlay: boolean
}

export type DpcThinkingStateProps = DpcProps<DpcThinkingStateComp>

const props = defineProps<DpcThinkingStateProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcThinkingStateComp>(props, {
  compDefaults: {
    variant: 'Steps',
    active: '',
    done: '',
    query: '',
    rows: [],
    autoPlay: true,
  },
})

const emit = defineEmits<{
  /** 追踪动画结束（可在此之后接续正文流式输出） */
  (e: 'settled'): void
  /** 展开 / 收起追踪详情 */
  (e: 'toggle', expanded: boolean): void
  /** Coding 变体选中某个工具行 */
  (e: 'selectTool', label: string | null): void
}>()

const STAGES = [800, 600, 1800, 2600, 1600]

const VARIANT_COPY: Record<DpcThinkingVariant, { active: string; done: string }> = {
  Steps: { active: 'Thinking', done: 'Thought for 4 seconds' },
  Reasoning: { active: 'Thinking', done: 'Thought for 4 seconds' },
  Search: { active: 'Searching the web', done: 'Searched the web' },
  Coding: { active: 'Running tools', done: 'Ran 3 tools' },
}

const { stage } = useSequence(STAGES, c.value.autoPlay)

const manualExpanded = ref<boolean | null>(null)
const selectedTool = ref<string | null>(null)

const working = computed(() => stage.value < 3)
const autoExpanded = computed(() => stage.value >= 1 && stage.value < 4)
const expanded = computed(() => manualExpanded.value ?? autoExpanded.value)
const visible = computed(() => {
  if (stage.value < 2) return 0
  if (stage.value === 2) return Math.min(2, c.value.rows.length)
  return c.value.rows.length
})

const copy = computed(() => VARIANT_COPY[c.value.variant] ?? VARIANT_COPY.Steps)
const resolvedActive = computed(() => c.value.active || copy.value.active)
const resolvedDone = computed(() => c.value.done || copy.value.done)

let settled = false
watch(
  working,
  (isWorking) => {
    if (!isWorking && !settled) {
      settled = true
      emit('settled')
    }
  },
  { immediate: true },
)

function toggleExpanded() {
  const current = manualExpanded.value ?? autoExpanded.value
  manualExpanded.value = !current
  emit('toggle', !current)
}

function toggleTool(label: string) {
  const next = selectedTool.value === label ? null : label
  selectedTool.value = next
  emit('selectTool', next)
}

const SHIMMER_STYLE = {
  backgroundImage:
    'linear-gradient(90deg, var(--dpc-color-ink-3) 35%, var(--dpc-color-ink) 50%, var(--dpc-color-ink-3) 65%)',
  backgroundSize: '200% 100%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  animation: 'dpc-shimmer-text 1.4s linear infinite',
}

const ROW_TONES = ['var(--dpc-color-accent)', 'var(--dpc-color-orange)', 'var(--dpc-color-green)']

function toneStyle(index: number) {
  return { background: ROW_TONES[index % ROW_TONES.length] ?? ROW_TONES[0] }
}
</script>

<template>
  <div
    v-bind="rootAttrs"
    class="dpc-thinking flex w-full max-w-95 flex-col"
    :style="{
      minHeight: working || expanded ? '176px' : undefined,
      transition: 'min-height 400ms cubic-bezier(0.23, 1, 0.32, 1)',
    }"
  >
    <!-- 标题行：进行中为微光文字，结束后固定为耗时/结果 -->
    <button
      type="button"
      class="dpc-thinking__header -mx-1.5 flex w-fit cursor-pointer items-center gap-2 rounded-[var(--dpc-radius-control)] bg-transparent px-1.5 py-1 transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)]"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <span
        class="dpc-thinking__glyph flex shrink-0 transition-colors duration-200"
        :style="{ color: working ? 'var(--dpc-color-ink-2)' : 'var(--dpc-color-ink-3)' }"
      >
        <slot name="icon">
          <AgentIcon name="sparkle" :size="16" />
        </slot>
      </span>

      <span
        v-if="working"
        class="dpc-thinking__active text-[13px] font-medium whitespace-nowrap"
        :style="SHIMMER_STYLE"
      >
        {{ resolvedActive }}
      </span>
      <span
        v-else
        class="dpc-thinking__done text-[13px] font-medium whitespace-nowrap text-[var(--dpc-color-ink-2)]"
        :style="{ animation: 'dpc-fade-in 350ms ease-out both' }"
      >
        {{ resolvedDone }}
      </span>

      <AgentIcon
        name="chevron-down"
        :size="14"
        class="dpc-thinking__chevron text-[var(--dpc-color-ink-3)] transition-transform duration-300"
        :style="{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }"
      />
    </button>

    <!-- 可展开的追踪详情 -->
    <div
      class="dpc-thinking__trace grid"
      :style="{
        gridTemplateRows: expanded ? '1fr' : '0fr',
        opacity: expanded ? 1 : 0,
        transition:
          'grid-template-rows 400ms cubic-bezier(0.23, 1, 0.32, 1), opacity 400ms cubic-bezier(0.23, 1, 0.32, 1)',
      }"
    >
      <div class="overflow-hidden">
        <div class="relative mt-1 ml-[5px] pl-4">
          <span
            class="dpc-thinking__line absolute left-[3px] w-px bg-[var(--dpc-color-line)]"
            :style="{ top: '-8px', bottom: '0px' }"
            aria-hidden="true"
          />

          <div class="flex flex-col gap-1 py-1">
            <div
              v-if="c.query"
              class="flex h-6 items-center gap-2 px-1.5"
              :style="{
                animation: expanded
                  ? 'dpc-fade-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both'
                  : undefined,
              }"
            >
              <AgentIcon name="search" :size="14" class="shrink-0 text-[var(--dpc-color-ink-3)]" />
              <span class="text-[12.5px] text-[var(--dpc-color-ink-2)]">{{ c.query }}</span>
            </div>

            <component
              :is="
                c.variant === 'Search' && row.href ? 'a' : c.variant === 'Coding' ? 'button' : 'div'
              "
              v-for="(row, index) in c.rows.slice(0, visible)"
              :key="row.primary"
              :href="c.variant === 'Search' && row.href ? row.href : undefined"
              :target="c.variant === 'Search' && row.href ? '_blank' : undefined"
              :rel="c.variant === 'Search' && row.href ? 'noreferrer' : undefined"
              :type="c.variant === 'Coding' ? 'button' : undefined"
              :aria-pressed="c.variant === 'Coding' ? selectedTool === row.primary : undefined"
              class="dpc-thinking__row flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left"
              :class="[
                c.variant === 'Search' && row.href
                  ? 'transition-colors duration-150 hover:bg-[var(--dpc-color-hover)]'
                  : '',
                c.variant === 'Coding'
                  ? selectedTool === row.primary
                    ? 'cursor-pointer bg-[var(--dpc-color-inset)]'
                    : 'cursor-pointer bg-transparent transition-colors duration-150 hover:bg-[var(--dpc-color-hover)]'
                  : '',
              ]"
              :style="{
                animation: `dpc-fade-up 320ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 120}ms both`,
              }"
              @click="c.variant === 'Coding' ? toggleTool(row.primary) : undefined"
            >
              <span
                v-if="c.variant === 'Search'"
                class="flex size-3.5 shrink-0 items-center justify-center rounded-full text-white"
                :style="toneStyle(index)"
              >
                <AgentIcon name="globe" :size="9" :stroke-width="2.5" />
              </span>

              <template v-if="c.variant === 'Steps'">
                <AgentIcon
                  v-if="index < visible - 1 || !working"
                  name="check"
                  :size="14"
                  :stroke-width="2.5"
                  class="shrink-0 text-[var(--dpc-color-ink-3)]"
                />
                <span
                  v-else
                  class="dpc-thinking__spinner size-3 shrink-0 rounded-full border-[1.5px] border-[var(--dpc-color-line-strong)] border-t-[var(--dpc-color-ink-2)]"
                  :style="{ animation: 'dpc-spin 700ms linear infinite' }"
                />
              </template>

              <span
                class="min-w-0"
                :class="[
                  c.variant === 'Reasoning'
                    ? 'text-[12.5px] leading-relaxed text-[var(--dpc-color-ink-2)]'
                    : 'truncate text-[12.5px] font-medium text-[var(--dpc-color-ink)]',
                  c.variant === 'Search' ? 'dpc-animated-underline' : '',
                ]"
              >
                {{ row.primary }}
              </span>

              <span
                v-if="row.secondary"
                class="shrink-0 text-[11.5px] text-[var(--dpc-color-ink-3)]"
                :class="{ 'dpc-mono': row.mono }"
              >
                {{ row.secondary }}
              </span>

              <span v-if="row.add !== undefined" class="dpc-mono dpc-tabular shrink-0 text-[11px]">
                <span class="text-[var(--dpc-color-green)]">+{{ row.add }}</span>
                <span class="ml-1 text-[var(--dpc-color-red)]">−{{ row.del ?? 0 }}</span>
              </span>
            </component>

            <span
              v-if="c.variant === 'Search' && stage >= 3"
              class="text-[12px] text-[var(--dpc-color-ink-3)]"
              :style="{ animation: 'dpc-fade-in 300ms ease-out both' }"
            >
              +7 more
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
