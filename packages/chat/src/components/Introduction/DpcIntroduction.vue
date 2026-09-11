<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import { DpcBotIcon, DpcSparkleIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcIntroduction', inheritAttrs: false })

export interface DpcIntroductionComp {
  /** 主标题（#title 插槽可覆盖） */
  title: string
  /** 描述文本（#description 插槽可覆盖） */
  description: string
  /** 内容区最大宽度 */
  maxWidth: number | string
  /** 在滚动区内垂直居中（内容较矮时） */
  centered: boolean
}

export type DpcIntroductionProps = DpcProps<DpcIntroductionComp>

const props = defineProps<DpcIntroductionProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcIntroductionComp>(props, {
  compDefaults: { title: '', description: '', maxWidth: 640, centered: true },
})

const maxWidthStyle = computed(() =>
  typeof c.value.maxWidth === 'number' ? `${c.value.maxWidth}px` : c.value.maxWidth,
)
</script>

<template>
  <!-- 欢迎/空态：无对话时的引导面板，常与 DpcPrompt 搭配 -->
  <div v-bind="rootAttrs"
    class="dpc-introduction flex w-full flex-col items-center justify-center gap-4 px-4 py-10 text-center"
    :class="{ 'mx-auto my-auto': c.centered }" :style="{ maxWidth: maxWidthStyle }">
    <div
      class="dpc-introduction__icon flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--dpc-color-primary)_10%,transparent)] text-[var(--dpc-color-primary)]">
      <slot name="icon">
        <DpcBotIcon :size="28" />
      </slot>
    </div>

    <slot name="title">
      <h2 class="dpc-introduction__title flex items-center gap-2 text-lg font-semibold text-[var(--dpc-color-text)]">
        {{ c.title }}
        <DpcSparkleIcon class="text-[var(--dpc-color-primary)]" :size="18" />
      </h2>
    </slot>

    <slot name="description">
      <p v-if="c.description" class="max-w-md text-sm text-[var(--dpc-color-text-secondary)]">
        {{ c.description }}
      </p>
    </slot>

    <slot />
  </div>
</template>
