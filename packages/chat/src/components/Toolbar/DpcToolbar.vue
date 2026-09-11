<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { DpButton, DpTooltip } from '@dp_ui/core'
import { useDpcProps } from '../../composables/useDpcProps'
import {
  DpcCheckIcon,
  DpcCopyIcon,
  DpcDeleteIcon,
  DpcDislikeIcon,
  DpcLikeIcon,
  DpcRefreshIcon,
} from '../../internal/icons'
import { useDpcLocale } from '../Locale/localeContext'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcToolbar', inheritAttrs: false })

export interface DpcToolbarComp {
  /** 展示内置操作 */
  showCopy: boolean
  showLike: boolean
  showDislike: boolean
  showRefresh: boolean
  showDelete: boolean
  /** 点赞/点踩激活态（由使用方控制） */
  liked: boolean
  disliked: boolean
  /** 复制内容（由本组件写入剪贴板并 emit copy） */
  content: string
}

export type DpcToolbarProps = DpcProps<DpcToolbarComp>

export type DpcToolbarActionKey = 'copy' | 'like' | 'dislike' | 'refresh' | 'delete'

const props = defineProps<DpcToolbarProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcToolbarComp>(props, {
  compDefaults: {
    showCopy: true,
    showLike: true,
    showDislike: true,
    showRefresh: false,
    showDelete: false,
    liked: false,
    disliked: false,
    content: '',
  },
})

const emit = defineEmits<{
  (e: 'copy', content: string): void
  (e: 'like'): void
  (e: 'dislike'): void
  (e: 'refresh'): void
  (e: 'delete'): void
}>()

const locale = useDpcLocale()

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

interface ToolbarAction {
  key: DpcToolbarActionKey
  label: string
  icon: Component
  active?: boolean
}

const actions = computed<ToolbarAction[]>(() => {
  const list: ToolbarAction[] = []
  if (c.value.showCopy)
    list.push({ key: 'copy', label: copied.value ? locale.copied : locale.copy, icon: DpcCopyIcon })
  if (c.value.showLike)
    list.push({ key: 'like', label: locale.like, icon: DpcLikeIcon, active: c.value.liked })
  if (c.value.showDislike)
    list.push({
      key: 'dislike',
      label: locale.dislike,
      icon: DpcDislikeIcon,
      active: c.value.disliked,
    })
  if (c.value.showRefresh)
    list.push({ key: 'refresh', label: locale.refresh, icon: DpcRefreshIcon })
  if (c.value.showDelete) list.push({ key: 'delete', label: locale.delete, icon: DpcDeleteIcon })
  return list
})

function currentIcon(action: ToolbarAction): Component {
  if (action.key === 'copy' && copied.value) return DpcCheckIcon
  return action.icon
}

async function handleCopy(content: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
    }
  } catch {
    /* 剪贴板不可用时忽略 */
  }
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
  emit('copy', content)
}

function onAction(key: DpcToolbarActionKey) {
  if (key === 'copy') {
    void handleCopy(c.value.content)
  } else if (key === 'like') {
    emit('like')
  } else if (key === 'dislike') {
    emit('dislike')
  } else if (key === 'refresh') {
    emit('refresh')
  } else if (key === 'delete') {
    emit('delete')
  }
}
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-toolbar flex items-center gap-0.5 text-[var(--dpc-color-text-secondary)]">
    <slot name="actions" />

    <!-- hover 提示复用 @dp_ui/core 的 DpTooltip -->
    <DpTooltip v-for="action in actions" :key="action.key"
      :comp="{ content: action.label, side: 'top', delayDuration: 0 }">
      <DpButton class="dpc-toolbar__action" :theme="{
        variant: action.active ? 'primary' : 'default',
        size: 'small',
        ghost: true,
        icon: true,
        cssVars: { '--dp-size-btn-h-sm': '24px' },
      }" :aria-label="action.label" :data-action="action.key" @click="onAction(action.key)">
        <component :is="currentIcon(action)" :size="14" />
      </DpButton>
    </DpTooltip>
  </div>
</template>
