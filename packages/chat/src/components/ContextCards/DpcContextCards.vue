<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcContextCards', inheritAttrs: false })

export interface DpcContextChunk {
  title: string
  /** 分块大小文案（如 `290 characters`） */
  chars: string
  body: string
  /** 来源文件名 */
  source: string
  /** 来源类型角标（PDF / CSV / MD） */
  badge: string
  /** 角标底色：red / green / orange / accent，缺省 accent */
  tone?: string
}

export interface DpcContextCardsLabels {
  header: string
  count: string
}

export interface DpcContextCardsComp {
  chunks: DpcContextChunk[]
  labels: Partial<DpcContextCardsLabels>
  /** 延迟揭示来源胶囊 */
  autoPlay: boolean
}

export type DpcContextCardsProps = DpcProps<DpcContextCardsComp>

const props = defineProps<DpcContextCardsProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcContextCardsComp>(props, {
  compDefaults: {
    chunks: [],
    labels: {},
    autoPlay: true,
  },
})

const copy = computed<DpcContextCardsLabels>(() => ({
  header: 'All chunks',
  count: String(c.value.chunks.length),
  ...c.value.labels,
}))

const chipsShown = ref(!c.value.autoPlay)
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  if (!c.value.autoPlay) return
  timer = setTimeout(() => {
    chipsShown.value = true
  }, 700)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const TONES: Record<string, string> = {
  red: 'var(--dpc-color-red)',
  green: 'var(--dpc-color-green)',
  orange: 'var(--dpc-color-orange)',
  accent: 'var(--dpc-color-accent)',
}

function toneColor(tone?: string) {
  return TONES[tone ?? 'accent'] ?? TONES.accent
}
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-context-cards flex w-full max-w-95 flex-col gap-2">
    <div
      class="flex items-center gap-2 px-0.5"
      :style="{ animation: 'dpc-fade-in 400ms ease-out both' }"
    >
      <span class="text-[13px] font-semibold text-[var(--dpc-color-ink)]">{{ copy.header }}</span>
      <span
        class="dpc-tabular inline-flex h-5 items-center rounded-md bg-[var(--dpc-color-inset)] px-1.5 text-[11.5px] font-medium text-[var(--dpc-color-ink-2)]"
        :style="{ boxShadow: 'var(--dpc-shadow-hairline)' }"
      >
        {{ copy.count }}
      </span>
    </div>

    <div
      v-for="(chunk, index) in c.chunks"
      :key="chunk.title"
      class="overflow-hidden rounded-[var(--dpc-radius-card)] bg-[var(--dpc-color-surface)]"
      :style="{
        boxShadow: 'var(--dpc-shadow-card)',
        animation: `dpc-fade-up 400ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 100}ms both`,
      }"
    >
      <div class="dpc-card-bar flex items-center gap-2.5 border-b border-[var(--dpc-color-line)]">
        <span
          class="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[var(--dpc-color-ink)]"
        >
          <AgentIcon name="file" :size="11" :stroke-width="2.5" />
          <span class="truncate">{{ chunk.title }}</span>
        </span>
        <span class="dpc-tabular ml-auto shrink-0 text-[12px] text-[var(--dpc-color-ink-3)]">
          {{ chunk.chars }}
        </span>
      </div>

      <p class="px-3 pt-2 pb-1 text-[12.5px] leading-relaxed text-[var(--dpc-color-ink-2)]">
        {{ chunk.body }}
      </p>

      <div class="px-3 pb-3">
        <span
          class="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--dpc-color-inset)] px-2 text-[12px] font-medium text-[var(--dpc-color-ink-2)] transition-colors duration-300 hover:bg-[var(--dpc-color-hover)]"
          :style="{
            boxShadow: 'var(--dpc-shadow-btn)',
            opacity: chipsShown ? 1 : 0,
            transform: chipsShown ? 'scale(1)' : 'scale(0.95)',
            transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
            transitionDelay: `${index * 80}ms`,
          }"
        >
          <span
            class="flex size-3.5 items-center justify-center rounded-[4px] text-[7px] font-bold text-white"
            :style="{ background: toneColor(chunk.tone) }"
          >
            {{ chunk.badge }}
          </span>
          {{ chunk.source }}
          <AgentIcon name="arrow-up-right" :size="9" :stroke-width="2.5" />
        </span>
      </div>
    </div>
  </div>
</template>
