<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import { DpcArrowDownIcon, DpcArrowUpIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcLayoutContent', inheritAttrs: false })

export interface DpcLayoutContentComp {
  /** 内容变高（如新消息）时自动滚到底；用户上翻后暂停，回到底部后恢复 */
  autoScroll: boolean
  /** 显示上/下滚动快捷箭头 */
  showScrollArrow: boolean
  /** 距底部多少 px 内视为「已到底」 */
  bottomThreshold: number
}

export type DpcLayoutContentProps = DpcProps<DpcLayoutContentComp>

const props = defineProps<DpcLayoutContentProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcLayoutContentComp>(props, {
  compDefaults: { autoScroll: true, showScrollArrow: false, bottomThreshold: 32 },
})

const emit = defineEmits<{
  (e: 'scroll', event: Event): void
}>()

const scrollerRef = ref<HTMLElement | null>(null)
const innerRef = ref<HTMLElement | null>(null)

let userControl = false
let observer: ResizeObserver | null = null

const canScrollUp = ref(false)
const canScrollDown = ref(false)

function readFlags() {
  const el = scrollerRef.value
  if (!el) {
    canScrollUp.value = false
    canScrollDown.value = false
    return
  }
  canScrollUp.value = el.scrollTop > 1
  canScrollDown.value = el.scrollHeight - el.scrollTop - el.clientHeight > 1
}

function scrollToPosition(position: number, smooth = true) {
  scrollerRef.value?.scrollTo({ top: position, behavior: smooth ? 'smooth' : 'auto' })
}

function scrollToBottom(smooth = true) {
  const el = scrollerRef.value
  if (!el) return
  scrollToPosition(el.scrollHeight, smooth)
}

function scrollToTop(smooth = true) {
  scrollToPosition(0, smooth)
}

function onScroll(event: Event) {
  const el = scrollerRef.value
  readFlags()
  if (el) {
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= c.value.bottomThreshold
    userControl = el.scrollTop > 1 && !atBottom
  }
  emit('scroll', event)
}

function handleInnerResize() {
  readFlags()
  if (c.value.autoScroll && !userControl) {
    void nextTick(() => scrollToBottom(false))
  }
}

watch(
  () => c.value.autoScroll,
  (auto) => {
    if (!auto) userControl = true
    else if (scrollerRef.value) {
      userControl = false
      void nextTick(() => scrollToBottom(false))
    }
  },
)

onMounted(() => {
  observer = new ResizeObserver(() => handleInnerResize())
  if (innerRef.value) observer.observe(innerRef.value)
  void nextTick(() => {
    readFlags()
    if (c.value.autoScroll) scrollToBottom(false)
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

defineExpose({ scrollToTop, scrollToBottom, scrollToPosition })
</script>

<template>
  <!-- 中部滚动区（Layout 第二行）：autoScroll 保证新消息自动吸底。 -->
  <div v-bind="rootAttrs" class="dpc-layout-content relative min-h-0 w-full overflow-y-auto overscroll-contain"
    @scroll="onScroll">
    <div ref="innerRef" class="dpc-layout-content__inner flex min-h-full w-full flex-col">
      <slot />
    </div>

    <template v-if="c.showScrollArrow">
      <DpButton v-if="canScrollUp"
        class="dpc-layout-content__arrow dpc-layout-content__arrow--up absolute right-3 top-3 z-10" :theme="{
          variant: 'default',
          size: 'small',
          round: true,
          icon: true,
          cssVars: { '--dp-size-btn-h-sm': '28px' },
        }" aria-label="scroll-top" @click="scrollToTop()">
        <DpcArrowUpIcon :size="14" />
      </DpButton>
      <DpButton v-if="canScrollDown"
        class="dpc-layout-content__arrow dpc-layout-content__arrow--down absolute bottom-3 right-3 z-10" :theme="{
          variant: 'default',
          size: 'small',
          round: true,
          icon: true,
          cssVars: { '--dp-size-btn-h-sm': '28px' },
        }" aria-label="scroll-bottom" @click="scrollToBottom()">
        <DpcArrowDownIcon :size="14" />
      </DpButton>
    </template>
  </div>
</template>
