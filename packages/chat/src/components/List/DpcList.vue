<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcList', inheritAttrs: false })

export type DpcListDirection = 'vertical' | 'horizontal'
export type DpcListVariant = 'transparent' | 'filled' | 'bordered' | 'none'

export interface DpcListItem {
  key: string | number
  label: string
  value?: string | number
  disabled?: boolean
  active?: boolean
  [key: string]: unknown
}

export interface DpcListComp {
  /** 布局方向 */
  direction: DpcListDirection
  /** 视觉变体 */
  variant: DpcListVariant
  /** 列表数据（建议项/菜单项） */
  data: DpcListItem[]
  /** 是否可选中（点击后置 activeKey） */
  selectable: boolean
}

export type DpcListProps = DpcProps<DpcListComp>

const props = defineProps<DpcListProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcListComp>(props, {
  compDefaults: { direction: 'vertical', variant: 'transparent', data: [], selectable: true },
})

const emit = defineEmits<{
  (e: 'select', item: DpcListItem): void
}>()

const activeKey = defineModel<string | number | null>('activeKey', { default: null })

const rootClasses = computed(() => [
  'dpc-list',
  c.value.direction === 'horizontal' ? 'flex flex-wrap items-center gap-2' : 'flex flex-col',
])

const itemIsActive = (item: DpcListItem) => item.active ?? activeKey.value === item.key

function itemClasses(item: DpcListItem) {
  const horizontal = c.value.direction === 'horizontal'
  const active = itemIsActive(item)
  const variant = c.value.variant
  const classes = [
    'dpc-list__item',
    'inline-flex min-w-0 items-center text-sm transition-colors',
    horizontal
      ? 'rounded-full px-3 py-1.5'
      : 'w-full justify-between rounded-[var(--dpc-radius-md)] px-3 py-2',
  ]
  if (variant === 'filled' || variant === 'bordered') {
    classes.push(
      'border border-[var(--dpc-color-border)] bg-[var(--dpc-color-surface)]',
      horizontal ? 'hover:border-[var(--dpc-color-primary)]' : '',
    )
    if (active) classes.push('border-[var(--dpc-color-primary)] text-[var(--dpc-color-primary)]')
  } else {
    classes.push(horizontal ? '' : 'hover:bg-[var(--dpc-color-hover-soft)]')
    if (active) classes.push('text-[var(--dpc-color-primary)]')
  }
  return classes
}

function onClick(item: DpcListItem) {
  if (item.disabled || !c.value.selectable) return
  activeKey.value = item.key
  emit('select', item)
}
</script>

<template>
  <div v-bind="rootAttrs" :class="rootClasses" role="list">
    <button v-for="item in c.data" :key="item.key" type="button" class="dpc-list__item-btn" :class="itemClasses(item)"
      role="listitem" :disabled="item.disabled" @click="onClick(item)">
      <slot name="item" :item="item">
        <span class="dpc-list__item-label min-w-0 truncate">{{ item.label }}</span>
        <span v-if="itemIsActive(item)" class="dpc-list__item-check text-[var(--dpc-color-primary)]" aria-hidden="true">
          ✓
        </span>
      </slot>
    </button>
  </div>
</template>
