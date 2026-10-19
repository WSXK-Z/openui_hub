<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcApprovalCard', inheritAttrs: false })

export interface DpcApprovalQuestion {
  q: string
  /** 单选自动前进；多选等待用户点继续 */
  type: 'radio' | 'check'
  options: string[]
}

export interface DpcApprovalLabels {
  skip: string
  continue: string
  send: string
  customPlaceholder: string
  sentMessage: string
  startOver: string
  dismiss: string
}

export interface DpcApprovalCardComp {
  questions: DpcApprovalQuestion[]
  labels: Partial<DpcApprovalLabels>
  /** 提交后允许「重新开始」 */
  resettable: boolean
  /** 初始展开 */
  defaultOpen: boolean
}

export type DpcApprovalCardProps = DpcProps<DpcApprovalCardComp>

const props = defineProps<DpcApprovalCardProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcApprovalCardComp>(props, {
  compDefaults: {
    questions: [],
    labels: {},
    resettable: true,
    defaultOpen: true,
  },
})

const emit = defineEmits<{
  /** 当前题答案变化 */
  (e: 'answerChange', questionIndex: number, answer: number[]): void
  /** 全部答完提交 */
  (e: 'submitted', answers: Record<number, number[]>): void
}>()

const LABEL_DEFAULTS: DpcApprovalLabels = {
  skip: 'Skip',
  continue: 'Continue',
  send: 'Send',
  customPlaceholder: 'Something else…',
  sentMessage: 'Answers sent',
  startOver: 'Start over',
  dismiss: 'Dismiss',
}

const labels = computed(() => ({ ...LABEL_DEFAULTS, ...c.value.labels }))

const qi = ref(0)
const answers = ref<Record<number, number[]>>({})
const custom = ref<Record<number, string>>({})
const sent = ref(false)
const open = ref(c.value.defaultOpen)
const viewportH = ref<number | undefined>(undefined)
const trackY = ref(0)
const animate = ref(false)

let measured = false
let advanceTimer: ReturnType<typeof setTimeout> | null = null
const questionEls: (HTMLElement | undefined)[] = []

const current = computed(() => c.value.questions[qi.value])
const last = computed(() => qi.value === c.value.questions.length - 1)
const selected = computed<number[]>(() => answers.value[qi.value] ?? [])
const hasAnswer = computed(
  () => selected.value.length > 0 || Boolean(custom.value[qi.value]?.trim()),
)

function setQuestionRef(el: unknown, index: number) {
  questionEls[index] = el instanceof HTMLElement ? el : undefined
}

async function sync() {
  await nextTick()
  const el = questionEls[qi.value]
  if (!el) return
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  viewportH.value = el.offsetHeight
  trackY.value = el.offsetTop
  animate.value = measured && !reduce
  measured = true
}

onMounted(sync)

watch([qi, answers, custom, open, sent], () => {
  void sync()
})

onBeforeUnmount(() => {
  if (advanceTimer) clearTimeout(advanceTimer)
})

function clearAdvance() {
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
}

function goTo(next: number) {
  clearAdvance()
  if (c.value.questions.length === 0) return
  qi.value = Math.min(Math.max(next, 0), c.value.questions.length - 1)
}

function send() {
  clearAdvance()
  sent.value = true
  emit('submitted', answers.value)
}

function advance() {
  if (last.value) send()
  else goTo(qi.value + 1)
}

function toggle(index: number) {
  const question = current.value
  if (!question) return
  const picked = answers.value[qi.value] ?? []
  const next =
    question.type === 'radio'
      ? [index]
      : picked.includes(index)
        ? picked.filter((item) => item !== index)
        : [...picked, index]

  answers.value = { ...answers.value, [qi.value]: next }
  emit('answerChange', qi.value, next)

  if (question.type === 'radio') {
    custom.value = { ...custom.value, [qi.value]: '' }
    clearAdvance()
    advanceTimer = setTimeout(() => {
      if (last.value) send()
      else qi.value = Math.min(c.value.questions.length - 1, qi.value + 1)
    }, 480)
  }
}

function onCustomInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  custom.value = { ...custom.value, [qi.value]: value }
  if (current.value?.type === 'radio' && answers.value[qi.value]?.length) {
    answers.value = { ...answers.value, [qi.value]: [] }
    emit('answerChange', qi.value, [])
  }
}

function reset() {
  qi.value = 0
  answers.value = {}
  custom.value = {}
  sent.value = false
  open.value = true
  measured = false
  void sync()
}

function reopen() {
  open.value = true
  void sync()
}

const trackStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '26px',
  transform: `translate3d(0, ${-trackY.value}px, 0)`,
  transition: animate.value ? 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
  willChange: 'transform',
}))

function questionStyle(index: number) {
  const active = index === qi.value
  return {
    opacity: active ? 1 : 0,
    transition: animate.value ? 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
    pointerEvents: active ? ('auto' as const) : ('none' as const),
  }
}

function optionBoxClass(on: boolean, type: 'radio' | 'check') {
  return [
    'flex size-4 shrink-0 items-center justify-center transition-colors duration-200',
    type === 'radio' ? 'rounded-full' : 'rounded-[5px]',
    on ? 'bg-[var(--dpc-color-ink)] text-[var(--dpc-color-canvas)]' : 'text-transparent',
  ]
}

const uncheckedRing = { boxShadow: 'inset 0 0 0 1.5px var(--dpc-color-line-strong)' }
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-approval w-full max-w-80">
    <!-- 收起态 -->
    <button
      v-if="!open"
      type="button"
      class="cursor-pointer rounded-[var(--dpc-radius-control)] bg-[var(--dpc-color-surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--dpc-color-ink)] transition-colors duration-150 hover:bg-[var(--dpc-color-hover)]"
      :style="{ boxShadow: 'var(--dpc-shadow-btn)' }"
      @click="reopen"
    >
      Open approval
    </button>

    <!-- 提交完成态 -->
    <div
      v-else-if="sent"
      class="flex w-full items-center gap-3"
      :style="{ animation: 'dpc-pop-in 260ms cubic-bezier(0.23, 1, 0.32, 1) both' }"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-[var(--dpc-color-green-tint)] py-1 pr-2.5 pl-1 text-[12.5px] font-medium text-[var(--dpc-color-green)]"
      >
        <span
          class="flex size-[18px] items-center justify-center rounded-full bg-[var(--dpc-color-green)] text-white"
        >
          <AgentIcon name="check" :size="11" :stroke-width="3" />
        </span>
        {{ labels.sentMessage }}
      </span>
      <button
        v-if="c.resettable"
        type="button"
        class="cursor-pointer bg-transparent text-[12px] font-medium text-[var(--dpc-color-ink-3)] transition-colors duration-150 hover:text-[var(--dpc-color-ink)]"
        @click="reset"
      >
        {{ labels.startOver }}
      </button>
    </div>

    <!-- 问答卡片 -->
    <div
      v-else-if="current"
      class="relative overflow-hidden rounded-[var(--dpc-radius-card)] bg-[var(--dpc-color-surface)]"
      :style="{
        boxShadow: 'var(--dpc-shadow-card)',
        animation: 'dpc-fade-up 380ms cubic-bezier(0.23, 1, 0.32, 1) both',
      }"
    >
      <button
        type="button"
        class="dpc-icon-button absolute top-2.5 right-2.5 z-10 cursor-pointer bg-transparent text-[var(--dpc-color-ink-3)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover)] hover:text-[var(--dpc-color-ink)]"
        :aria-label="labels.dismiss"
        @click="open = false"
      >
        <AgentIcon name="close" :size="14" :stroke-width="2.2" />
      </button>

      <div class="dpc-card-pad">
        <div
          class="overflow-hidden"
          :style="{
            height: viewportH === undefined ? undefined : `${viewportH}px`,
            transition: animate ? 'height 360ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
          }"
          aria-live="polite"
        >
          <div :style="trackStyle">
            <div
              v-for="(question, index) in c.questions"
              :key="index"
              :ref="(el) => setQuestionRef(el, index)"
              :aria-hidden="index === qi ? undefined : true"
              :style="questionStyle(index)"
            >
              <div class="pr-7 text-[14px] font-medium text-[var(--dpc-color-ink)]">
                {{ question.q }}
              </div>

              <div class="mt-2.5 flex flex-col gap-1">
                <button
                  v-for="(option, optionIndex) in question.options"
                  :key="option"
                  type="button"
                  class="relative z-10 flex cursor-pointer items-center gap-1.5 rounded-[var(--dpc-radius-control)] bg-transparent py-1 pr-2 pl-1 text-left transition-colors duration-100 hover:bg-[var(--dpc-color-hover)]"
                  :aria-pressed="
                    index === qi ? (answers[index] ?? []).includes(optionIndex) : undefined
                  "
                  :tabindex="index === qi ? 0 : -1"
                  @click="index === qi ? toggle(optionIndex) : undefined"
                >
                  <span
                    :class="
                      optionBoxClass((answers[index] ?? []).includes(optionIndex), question.type)
                    "
                    :style="
                      (answers[index] ?? []).includes(optionIndex) ? undefined : uncheckedRing
                    "
                  >
                    <span
                      v-if="question.type === 'radio'"
                      class="size-1.5 rounded-full bg-[var(--dpc-color-canvas)] transition-transform duration-200"
                      :style="{
                        transform: (answers[index] ?? []).includes(optionIndex)
                          ? 'scale(1)'
                          : 'scale(0)',
                      }"
                    />
                    <AgentIcon v-else name="check" :size="12" :stroke-width="3" />
                  </span>
                  <span
                    class="text-[13px] leading-none transition-colors duration-200"
                    :class="
                      (answers[index] ?? []).includes(optionIndex)
                        ? 'text-[var(--dpc-color-ink)]'
                        : 'text-[var(--dpc-color-ink-2)]'
                    "
                  >
                    {{ option }}
                  </span>
                </button>

                <label
                  class="relative z-10 flex items-center gap-1.5 rounded-[var(--dpc-radius-control)] py-1 pr-2 pl-1"
                >
                  <input
                    class="min-w-0 flex-1 bg-transparent pl-1.5 text-[13px] text-[var(--dpc-color-ink)] outline-none placeholder:text-[var(--dpc-color-ink-3)]"
                    :value="custom[index] ?? ''"
                    :tabindex="index === qi ? 0 : -1"
                    :placeholder="labels.customPlaceholder"
                    aria-label="Custom answer"
                    @input="index === qi ? onCustomInput($event) : undefined"
                    @keydown.enter.prevent="index === qi && hasAnswer ? advance() : undefined"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤 + 操作 -->
      <div
        class="dpc-card-footer flex items-center justify-between gap-3 border-t border-[var(--dpc-color-line)]"
      >
        <div class="flex items-center gap-1 text-[var(--dpc-color-ink-3)]">
          <button
            type="button"
            class="flex size-[18px] cursor-pointer items-center justify-center rounded-[5px] bg-transparent transition-colors duration-100 enabled:hover:text-[var(--dpc-color-ink)] disabled:cursor-default disabled:opacity-30"
            aria-label="Previous question"
            :disabled="qi <= 0"
            @click="goTo(qi - 1)"
          >
            <AgentIcon name="chevron-left" :size="12" :stroke-width="2.2" />
          </button>
          <span class="dpc-mono dpc-tabular text-[11.5px]">
            {{ qi + 1 }}/{{ c.questions.length }}
          </span>
          <button
            type="button"
            class="flex size-[18px] cursor-pointer items-center justify-center rounded-[5px] bg-transparent transition-colors duration-100 enabled:hover:text-[var(--dpc-color-ink)] disabled:cursor-default disabled:opacity-30"
            aria-label="Next question"
            :disabled="last"
            @click="goTo(qi + 1)"
          >
            <AgentIcon name="chevron-right" :size="12" :stroke-width="2.2" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="cursor-pointer bg-transparent text-[12px] font-medium text-[var(--dpc-color-ink-3)] transition-colors duration-150 hover:text-[var(--dpc-color-ink)]"
            @click="advance"
          >
            {{ labels.skip }}
          </button>
          <button
            type="button"
            class="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--dpc-color-ink)] px-3 text-[12px] font-medium text-[var(--dpc-color-canvas)] transition-opacity duration-150 hover:opacity-90 disabled:cursor-default disabled:opacity-40"
            :disabled="!hasAnswer"
            @click="advance"
          >
            {{ last ? labels.send : labels.continue }}
            <AgentIcon v-if="!last" name="chevron-right" :size="11" :stroke-width="2.4" />
            <span v-else class="dpc-mono text-[11px] opacity-70">⏎</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
