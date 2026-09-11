<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
import { useDpcProps } from '../../composables/useDpcProps'
import { DpcCloseIcon, DpcFileIcon, DpcRefreshIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcFileList', inheritAttrs: false })

export type DpcFileStatus = 'uploading' | 'done' | 'error'

export interface DpcFileListItem {
  id?: string | number
  name: string
  size?: number
  status?: DpcFileStatus
  [key: string]: unknown
}

export interface DpcFileListComp {
  files: DpcFileListItem[]
}

export type DpcFileListProps = DpcProps<DpcFileListComp>

const props = defineProps<DpcFileListProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcFileListComp>(props, {
  compDefaults: { files: [] },
})

const emit = defineEmits<{
  (e: 'remove', file: DpcFileListItem): void
  (e: 'retry', file: DpcFileListItem): void
}>()

const STATUS_TEXT: Record<DpcFileStatus, string> = {
  uploading: '上传中…',
  done: '已就绪',
  error: '上传失败',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = units[0] ?? 'KB'
  for (let i = 1; i < units.length && value >= 1024; i += 1) {
    value /= 1024
    unit = units[i] ?? 'KB'
  }
  return `${value.toFixed(1)} ${unit}`
}
</script>

<template>
  <!-- 已选附件列表 -->
  <ul v-bind="rootAttrs" class="dpc-file-list flex flex-col gap-1.5">
    <li v-for="file in c.files" :key="file.id ?? file.name"
      class="dpc-file-list__item flex items-center gap-2 rounded-[var(--dpc-radius-md)] border border-[var(--dpc-color-border)] bg-[var(--dpc-color-surface)] px-2.5 py-2">
      <DpcFileIcon class="shrink-0 text-[var(--dpc-color-text-secondary)]" :size="16" />
      <span class="dpc-file-list__name min-w-0 flex-1 truncate text-sm text-[var(--dpc-color-text)]">
        {{ file.name }}
      </span>
      <span v-if="file.size != null"
        class="dpc-file-list__size shrink-0 text-xs text-[var(--dpc-color-text-secondary)]">
        {{ formatSize(file.size) }}
      </span>
      <span v-if="file.status" class="dpc-file-list__status shrink-0 text-xs" :class="file.status === 'error'
        ? 'text-[var(--dpc-color-danger)]'
        : 'text-[var(--dpc-color-text-secondary)]'
        ">
        {{ STATUS_TEXT[file.status] ?? '' }}
      </span>
      <DpButton v-if="file.status === 'error'" class="dpc-file-list__retry" :theme="{
        variant: 'default',
        size: 'small',
        ghost: true,
        icon: true,
        cssVars: { '--dp-size-btn-h-sm': '24px' },
      }" :aria-label="'重试'" @click="emit('retry', file)">
        <DpcRefreshIcon :size="14" />
      </DpButton>
      <DpButton class="dpc-file-list__remove" :theme="{
        variant: 'danger',
        size: 'small',
        ghost: true,
        icon: true,
        cssVars: { '--dp-size-btn-h-sm': '24px' },
      }" :aria-label="'移除'" @click="emit('remove', file)">
        <DpcCloseIcon :size="14" />
      </DpButton>
    </li>
  </ul>
</template>
