<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcStreamingText', inheritAttrs: false })

export interface DpcStreamingToken {
  /** 一个词或短语 */
  text: string
  /** 该位置渲染一个行内来源引用 */
  cite?: boolean
}

export interface DpcStreamingSource {
  name: string
  domain: string
  href: string
  /** 来源图标地址；留空时用域名首字占位 */
  image?: string
}

export interface DpcStreamingLabels {
  /** 来源折叠按钮文案 */
  sources: string
  /** 追问标题 */
  followUps: string
}

export interface DpcStreamingTextComp {
  /** 流式词序列；`cite` 项渲染行内引用 */
  content: DpcStreamingToken[]
  /** 引用来源，用于行内 chip、头像堆叠与展开列表 */
  sources: DpcStreamingSource[]
  /** 完成后展示的追问建议 */
  followUps: string[]
  /** 文案覆盖 */
  labels: Partial<DpcStreamingLabels>
  /** 完成后停顿再重播 */
  loop: boolean
  /** 自动推进；关闭后由 `complete()` / `setCount()` 手动驱动 */
  autoPlay: boolean
  /** 占满父宽度（默认画廊尺度） */
  fill: boolean
  /** 每个词的间隔毫秒数 */
  speed: number
}

export type DpcStreamingTextProps = DpcProps<DpcStreamingTextComp>

const props = defineProps<DpcStreamingTextProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcStreamingTextComp>(props, {
  compDefaults: {
    content: [],
    sources: [],
    followUps: [],
    labels: {},
    loop: true,
    autoPlay: true,
    fill: false,
    speed: 55,
  },
})

const emit = defineEmits<{
  /** 本次流式输出结束 */
  (e: 'done'): void
  /** 选择追问 */
  (e: 'followUp', text: string, index: number): void
  /** 点击正文操作（复制 / 重试 / 赞 / 踩） */
  (e: 'action', action: 'copy' | 'retry' | 'thumbs-up' | 'thumbs-down'): void
  /** 打开来源 */
  (e: 'sourceClick', source: DpcStreamingSource): void
}>()

const HOLD_MS = 3400
const labels = computed<DpcStreamingLabels>(() => ({
  sources: '10 sources',
  followUps: 'Follow-ups',
  ...c.value.labels,
}))

const count = ref(0)
const sourcesOpen = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let announced = false

const done = computed(() => count.value >= c.value.content.length)
const primarySource = computed<DpcStreamingSource | undefined>(() => c.value.sources[0])

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function schedule() {
  clearTimer()
  if (!c.value.autoPlay) return
  if (done.value) {
    if (c.value.loop && c.value.content.length > 0) {
      timer = setTimeout(() => {
        count.value = 0
        announced = false
        schedule()
      }, HOLD_MS)
    }
    return
  }
  timer = setTimeout(() => {
    count.value += 1
    schedule()
  }, c.value.speed)
}

onMounted(schedule)
onBeforeUnmount(clearTimer)

watch(
  () => [c.value.autoPlay, c.value.speed, c.value.loop],
  () => schedule(),
)

watch(done, (isDone) => {
  if (isDone && !announced) {
    announced = true
    emit('done')
  }
})

/** 立刻展示全部内容 */
function complete() {
  clearTimer()
  count.value = c.value.content.length
}

/** 从头重新播放 */
function restart() {
  count.value = 0
  announced = false
  sourcesOpen.value = false
  schedule()
}

/** 外部逐词驱动时设置已展示词数 */
function setCount(value: number) {
  count.value = Math.max(0, Math.min(value, c.value.content.length))
}

defineExpose({ complete, restart, setCount })

function sourceInitial(source: DpcStreamingSource) {
  return (source.name.trim()[0] ?? '?').toUpperCase()
}

const ACTION_ICONS = ['copy', 'retry', 'thumbs-up', 'thumbs-down'] as const

function chipStyle(index: number) {
  return { animation: `dpc-pop-in 250ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 20}ms both` }
}
</script>

<template>
  <div
    v-bind="rootAttrs"
    class="dpc-streaming-text w-full"
    :class="c.fill ? '' : 'max-w-95 min-h-[15.5rem]'"
  >
    <p class="text-[13px] leading-relaxed text-[var(--dpc-color-ink)]">
      <template v-for="(token, index) in c.content.slice(0, count)" :key="index">
        <a
          v-if="token.cite && primarySource"
          class="dpc-streaming-text__cite mr-1 ml-0 inline-flex h-[18px] translate-y-[-1px] items-center gap-1 rounded-[5px] bg-[var(--dpc-color-inset)] px-[3px] align-middle text-[10.5px] text-[var(--dpc-color-ink-2)]"
          :style="[chipStyle(index), { boxShadow: 'var(--dpc-shadow-hairline)' }]"
          :href="primarySource.href"
          target="_blank"
          rel="noreferrer"
          @click="emit('sourceClick', primarySource)"
        >
          <img
            v-if="primarySource.image"
            class="dpc-source-avatar size-3 rounded-[3px]"
            :src="primarySource.image"
            alt=""
          />
          <span
            v-else
            class="dpc-source-avatar flex size-3 items-center justify-center rounded-[3px] bg-[var(--dpc-color-accent)] text-[7px] font-bold text-white"
            aria-hidden="true"
          >
            {{ sourceInitial(primarySource) }}
          </span>
          <span class="dpc-mono">{{ primarySource.domain }}</span>
        </a>
        <span v-else class="inline">{{ token.text }} </span>
      </template>

      <span
        v-if="!done"
        class="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-[var(--dpc-color-ink)]"
        :style="{ animation: 'dpc-caret-blink 900ms steps(1) infinite' }"
        aria-hidden="true"
      />
    </p>

    <!-- 操作区：完成后才可点 -->
    <div
      class="dpc-streaming-text__actions mt-2 flex items-center gap-0.5 transition-opacity duration-[400ms]"
      :style="{ opacity: done ? 1 : 0, pointerEvents: done ? 'auto' : 'none' }"
    >
      <button
        v-for="action in ACTION_ICONS"
        :key="action"
        type="button"
        class="flex size-6 cursor-pointer items-center justify-center rounded-[6px] bg-transparent text-[var(--dpc-color-ink-3)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)] hover:text-[var(--dpc-color-ink-2)]"
        :aria-label="action"
        @click="emit('action', action)"
      >
        <AgentIcon :name="action" :size="15" :stroke-width="1.8" />
      </button>

      <button
        type="button"
        class="ml-1.5 flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-transparent px-1 py-0.5 text-left transition-colors duration-150 hover:bg-[var(--dpc-color-hover)]"
        :aria-expanded="sourcesOpen"
        @click="sourcesOpen = !sourcesOpen"
      >
        <span class="flex">
          <span
            v-for="(source, index) in c.sources.slice(0, 3)"
            :key="source.domain"
            class="dpc-source-avatar flex size-3.5 items-center justify-center overflow-hidden rounded-full bg-[var(--dpc-color-surface)] text-[6px] font-bold text-[var(--dpc-color-ink-2)]"
            :style="{ marginLeft: index === 0 ? '0' : '-4px' }"
          >
            <img
              v-if="source.image"
              class="h-full w-full object-cover"
              :src="source.image"
              alt=""
            />
            <span v-else aria-hidden="true">{{ sourceInitial(source) }}</span>
          </span>
        </span>
        <span class="text-[12px] text-[var(--dpc-color-ink-2)]">{{ labels.sources }}</span>
      </button>
    </div>

    <!-- 展开的来源列表 -->
    <div
      class="dpc-streaming-text__sources grid"
      :style="{
        gridTemplateRows: done && sourcesOpen ? '1fr' : '0fr',
        opacity: done && sourcesOpen ? 1 : 0,
        transition:
          'grid-template-rows 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms cubic-bezier(0.23, 1, 0.32, 1)',
      }"
    >
      <div class="overflow-hidden">
        <div
          class="mt-1.5 flex flex-col rounded-[10px] bg-[var(--dpc-color-inset)] p-1"
          :style="{ boxShadow: 'var(--dpc-shadow-hairline)' }"
        >
          <a
            v-for="source in c.sources"
            :key="source.domain"
            :href="source.href"
            target="_blank"
            rel="noreferrer"
            class="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[12px] text-[var(--dpc-color-ink-2)] transition-colors duration-150 hover:bg-[var(--dpc-color-hover)] hover:text-[var(--dpc-color-ink)]"
          >
            <img
              v-if="source.image"
              class="dpc-source-avatar size-4 rounded-[4px]"
              :src="source.image"
              alt=""
            />
            <span
              v-else
              class="dpc-source-avatar flex size-4 items-center justify-center rounded-[4px] bg-[var(--dpc-color-accent)] text-[8px] font-bold text-white"
              aria-hidden="true"
            >
              {{ sourceInitial(source) }}
            </span>
            <span class="dpc-animated-underline">{{ source.name }}</span>
            <span class="dpc-mono ml-auto text-[10.5px] text-[var(--dpc-color-ink-3)]">
              {{ source.domain }}
            </span>
          </a>
        </div>
      </div>
    </div>

    <!-- 追问 -->
    <div
      class="dpc-streaming-text__followups mt-2.5 transition-opacity duration-[400ms]"
      :style="{ opacity: done ? 1 : 0, pointerEvents: done ? 'auto' : 'none' }"
    >
      <p class="text-[12px] font-medium text-[var(--dpc-color-ink-2)]">{{ labels.followUps }}</p>
      <div class="mt-0.5 flex flex-col">
        <button
          v-for="(text, index) in c.followUps"
          :key="text"
          type="button"
          class="-mx-1.5 flex cursor-pointer items-center gap-2 rounded-[7px] border-b border-[var(--dpc-color-line)] bg-transparent px-1.5 py-1.5 text-left text-[12.5px] text-[var(--dpc-color-ink)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)]"
          :style="
            done
              ? {
                  animation: `dpc-fade-up 350ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 90}ms both`,
                }
              : { opacity: 0 }
          "
          @click="emit('followUp', text, index)"
        >
          <AgentIcon name="retry" :size="11" class="shrink-0 text-[var(--dpc-color-ink-3)]" />
          {{ text }}
        </button>
      </div>
    </div>
  </div>
</template>
