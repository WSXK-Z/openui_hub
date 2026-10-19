<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcLoadingState', inheritAttrs: false })

export type DpcLoadingStateVariant = 'Drive' | 'Dots' | 'Orbit' | 'Surfer'

export interface DpcLoadingStateComp {
  /** 状态文案；Surfer 变体缺省为「Subway surfing」，其余为「Churning」 */
  label: string
  /** Drive / Dots 为方点与圆点波前，Orbit 为绕行彗星，Surfer 在状态行下方附带媒体卡 */
  variant: DpcLoadingStateVariant
  /** 显示等宽数字的实时计时 */
  showElapsed: boolean
  /** Surfer 变体的媒体地址；留空时显示占位 */
  mediaSrc: string
}

export type DpcLoadingStateProps = DpcProps<DpcLoadingStateComp>

const props = defineProps<DpcLoadingStateProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcLoadingStateComp>(props, {
  compDefaults: {
    label: '',
    variant: 'Drive',
    showElapsed: true,
    mediaSrc: '',
  },
})

const CHEVRON: (number | null)[] = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3)
  const col = i % 3
  return (col + Math.abs(row - 1)) * 90
})

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3]
const ORBIT: (number | null)[] = Array.from({ length: 9 }, (_, i) => {
  const index = ORBIT_ORDER.indexOf(i)
  return index === -1 ? null : index * 110
})

const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: CHEVRON, dur: 650, round: false },
  Dots: { delays: CHEVRON, dur: 650, round: true },
  Orbit: { delays: ORBIT, dur: 950, round: false },
}

const pattern = computed(() => PATTERNS[c.value.variant] ?? PATTERNS.Drive!)

const resolvedLabel = computed(
  () => c.value.label || (c.value.variant === 'Surfer' ? 'Subway surfing' : 'Churning'),
)

const videoOk = ref(true)
const deciseconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!c.value.showElapsed) return
  timer = setInterval(() => {
    deciseconds.value += 1
  }, 100)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const elapsed = computed(() => {
  const total = deciseconds.value / 10
  if (total < 60) return `${total.toFixed(1)}s`
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`
})

const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 4px)',
  gap: '1.5px',
}

const LABEL_STYLE = {
  backgroundImage:
    'linear-gradient(90deg, var(--dpc-color-ink-3) 35%, var(--dpc-color-ink) 50%, var(--dpc-color-ink-3) 65%)',
  backgroundSize: '200% 100%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  animation: 'dpc-shimmer-text 1.4s linear infinite',
}

function pixelStyle(delay: number | null) {
  return {
    opacity: delay === null ? 0.07 : 0.15,
    animation:
      delay === null
        ? 'none'
        : `dpc-pixel-on ${pattern.value.dur}ms ease-in-out ${delay}ms infinite`,
  }
}
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-loading-state flex w-fit flex-col items-start" role="status">
    <div class="dpc-loading-state__row flex items-center gap-2.5">
      <span class="dpc-loading-state__grid shrink-0" :style="GRID_STYLE" aria-hidden="true">
        <span
          v-for="(delay, index) in pattern.delays"
          :key="index"
          class="dpc-loading-state__pixel size-[4px] bg-[var(--dpc-color-ink)]"
          :class="pattern.round ? 'rounded-full' : 'rounded-[1px]'"
          :style="pixelStyle(delay)"
        />
      </span>

      <span
        class="dpc-loading-state__label text-[13px] font-medium whitespace-nowrap"
        :style="LABEL_STYLE"
      >
        {{ resolvedLabel }}
      </span>

      <span
        v-if="c.showElapsed"
        class="dpc-loading-state__elapsed dpc-mono dpc-tabular text-[12px] text-[var(--dpc-color-ink-3)]"
      >
        {{ elapsed }}
      </span>
    </div>

    <div
      v-if="c.variant === 'Surfer'"
      class="dpc-loading-state__media mt-2 w-56 overflow-hidden rounded-[10px]"
      :style="{
        boxShadow: 'var(--dpc-shadow-overlay)',
        animation: 'dpc-pop-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        transformOrigin: 'top left',
      }"
    >
      <div
        class="relative w-full"
        :style="{ aspectRatio: '16 / 9', background: 'var(--dpc-color-tooltip-bg)' }"
      >
        <slot name="media">
          <video
            v-if="c.mediaSrc && videoOk"
            class="h-full w-full object-cover"
            :src="c.mediaSrc"
            autoplay
            muted
            loop
            playsinline
            @error="videoOk = false"
          />
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center gap-1.5"
            :style="{
              background:
                'linear-gradient(135deg, var(--dpc-color-tooltip-bg), var(--dpc-color-accent))',
            }"
          >
            <span class="dpc-loading-state__grid" :style="GRID_STYLE" aria-hidden="true">
              <span
                v-for="(delay, index) in CHEVRON"
                :key="index"
                class="size-[4px] rounded-[1px] bg-white/80"
                :style="pixelStyle(delay)"
              />
            </span>
            <span class="px-3 text-center text-[10px] text-white/70">No media</span>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>
