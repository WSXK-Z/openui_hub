<script setup lang="ts">
import { computed } from 'vue'
import { DpPopover } from '@dp_ui/core'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcMention', inheritAttrs: false })

export interface DpcMentionOption {
  key: string | number
  label: string
  value?: string | number
}

export interface DpcMentionComp {
  /** 候选项 */
  options: DpcMentionOption[]
  /** 外部输入过滤词（如用户已输入的 @ 关键词） */
  query: string
  /** 加载中占位 */
  loading: boolean
}

export type DpcMentionProps = DpcProps<DpcMentionComp>

const props = defineProps<DpcMentionProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcMentionComp>(props, {
  compDefaults: { options: [], query: '', loading: false },
})

const emit = defineEmits<{
  (e: 'select', option: DpcMentionOption): void
}>()

const open = defineModel<boolean>('open', { default: false })

const filteredOptions = computed(() => {
  const q = c.value.query.trim().toLowerCase()
  if (!q) return c.value.options
  return c.value.options.filter((o) => o.label.toLowerCase().includes(q))
})

function pick(option: DpcMentionOption) {
  open.value = false
  emit('select', option)
}

defineExpose({ open, filteredOptions })
</script>

<template>
  <!-- @提及候选（浮层复用 @dp_ui/core 的 DpPopover，chat 不直接依赖 reka-ui）。
        默认插槽为触发元素；父组件按需控制 open / query。 -->
  <DpPopover v-bind="rootAttrs" v-model:open="open" :comp="{ side: 'bottom', align: 'start', sideOffset: 6 }">
    <slot />
    <template #content>
      <div class="dpc-mention w-56">
        <div class="dpc-mention__list max-h-56 overflow-y-auto p-1">
          <div v-if="c.loading" class="dpc-mention__loading px-3 py-2 text-xs text-[var(--dpc-color-text-secondary)]">
            加载中…
          </div>
          <template v-else>
            <button v-for="option in filteredOptions" :key="option.key" type="button"
              class="dpc-mention__option flex w-full items-center justify-between gap-2 rounded-[var(--dpc-radius-sm)] px-3 py-1.5 text-left text-sm text-[var(--dpc-color-text)] transition-colors hover:bg-[var(--dpc-color-hover-soft)] hover:text-[var(--dpc-color-primary)]"
              @click="pick(option)">
              <span class="dpc-mention__label min-w-0 truncate">{{ option.label }}</span>
              <span v-if="option.value != null && option.value !== option.label"
                class="dpc-mention__value shrink-0 text-xs text-[var(--dpc-color-text-secondary)]">
                {{ option.value }}
              </span>
            </button>
            <div v-if="filteredOptions.length === 0"
              class="dpc-mention__empty px-3 py-2 text-xs text-[var(--dpc-color-text-secondary)]">
              无匹配项
            </div>
          </template>
        </div>
      </div>
    </template>
  </DpPopover>
</template>
