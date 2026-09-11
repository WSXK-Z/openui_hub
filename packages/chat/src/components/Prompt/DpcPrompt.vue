<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import { DpcSparkleIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcPrompt', inheritAttrs: false })

export type DpcPromptDirection = 'vertical' | 'horizontal'

export interface DpcPromptItem {
  key: string | number
  label: string
  desc?: string
}

export interface DpcPromptComp {
  /** 布局：vertical 为整行卡片堆叠，horizontal 为胶囊一排 */
  direction: DpcPromptDirection
  /** 提示语列表 */
  list: DpcPromptItem[]
}

export type DpcPromptProps = DpcProps<DpcPromptComp>

const props = defineProps<DpcPromptProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcPromptComp>(props, {
  compDefaults: { direction: 'vertical', list: [] },
})

const emit = defineEmits<{
  (e: 'select', item: DpcPromptItem): void
}>()

const rootClasses = computed(() => [
  'dpc-prompt',
  c.value.direction === 'horizontal'
    ? 'flex flex-wrap justify-center gap-2'
    : 'flex w-full flex-col gap-2',
])
</script>

<template>
  <div v-bind="rootAttrs" :class="rootClasses">
    <button v-for="item in c.list" :key="item.key" type="button"
      class="dpc-prompt__item flex cursor-pointer items-center gap-2 text-left transition-colors" :class="c.direction === 'horizontal'
          ? 'rounded-full border border-[var(--dpc-color-border)] bg-[var(--dpc-color-surface)] px-3.5 py-1.5 text-[13px] text-[var(--dpc-color-text)] hover:border-[var(--dpc-color-primary)] hover:text-[var(--dpc-color-primary)]'
          : 'w-full rounded-[var(--dpc-radius-lg)] border border-[var(--dpc-color-border)] bg-[var(--dpc-color-surface)] px-4 py-3 hover:border-[var(--dpc-color-primary)] hover:bg-[var(--dpc-color-active-soft)]'
        " @click="emit('select', item)">
      <DpcSparkleIcon v-if="c.direction === 'vertical'" class="shrink-0 text-[var(--dpc-color-primary)]" :size="15" />
      <span class="dpc-prompt__label min-w-0">
        <span v-if="item.desc" class="flex flex-col leading-snug">
          <span class="truncate text-sm font-medium text-[var(--dpc-color-text)]">{{
            item.label
            }}</span>
          <span class="truncate text-xs text-[var(--dpc-color-text-secondary)]">{{
            item.desc
            }}</span>
        </span>
        <span v-else class="text-sm text-[var(--dpc-color-text)]">{{ item.label }}</span>
      </span>
    </button>
  </div>
</template>
