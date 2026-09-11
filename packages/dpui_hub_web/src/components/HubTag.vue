<script setup lang="ts">
/**
 * 状态标签：卡片 header、表格状态列里的短文本标记（如 `latest`、`有效` / `已吊销`）。
 *
 * 尺寸固定（h-6 / 13px 字号），颜色由 `type` 决定；基础类只负责结构与排布，
 * 边框与底色用同一语义色的半透明版本，避免为每个语义新增 CSS 变量。
 */
import { computed } from 'vue'

export type HubTagType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const props = withDefaults(defineProps<{ type?: HubTagType }>(), { type: 'default' })

const TYPE_CLASSES: Record<HubTagType, string> = {
  default: 'border-gray-200 bg-white text-gray-800',
  primary: 'border-blue-500/40 bg-blue-500/8 text-blue-500',
  success: 'border-green-500/40 bg-green-500/8 text-green-500',
  warning: 'border-amber-500/40 bg-amber-500/8 text-amber-500',
  danger: 'border-red-500/40 bg-red-500/8 text-red-500',
  info: 'border-cyan-500/40 bg-cyan-500/8 text-cyan-500',
}

const classes = computed(() => [
  'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm border px-2.5 text-[13px] leading-none',
  TYPE_CLASSES[props.type],
])
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
