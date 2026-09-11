<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import { DpcBotIcon, DpcUserIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'
import DpcBubbleLoading from './DpcBubbleLoading.vue'

defineOptions({ name: 'DpcBubble', inheritAttrs: false })

export type DpcBubbleRole = 'user' | 'assistant'
export type DpcBubbleAlign = 'left' | 'right'
export type DpcBubbleVariant = 'filled' | 'none' | 'bordered'

export interface DpcBubbleAvatar {
  /** 头像图片地址（缺省时回退角色图标/首字） */
  imgSrc?: string
  /** 头像显示名（无 imgSrc 时取首字） */
  name?: string
}

export interface DpcBubbleComp {
  /** 发言方：user 默认靠右，assistant 默认靠左 */
  role: DpcBubbleRole
  /** 纯文本内容（富文本请用 #content 插槽渲染，如 MarkdownCard） */
  content: string
  /** 显式对齐（缺省由 role 推导） */
  align: DpcBubbleAlign | null
  /** 气泡样式：filled 填充 / bordered 描边 / none 透明 */
  variant: DpcBubbleVariant
  /** 头像配置 */
  avatar: DpcBubbleAvatar | null
  /** 生成中：内容区显示打字指示 */
  loading: boolean
  /** 状态文本（如「已深度思考（用时 15 秒）」） */
  statusText: string
}

export type DpcBubbleProps = DpcProps<DpcBubbleComp>

const props = defineProps<DpcBubbleProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcBubbleComp>(props, {
  compDefaults: {
    role: 'assistant',
    content: '',
    align: null,
    variant: 'filled',
    avatar: null,
    loading: false,
    statusText: '',
  },
})

const isRight = computed(() => {
  if (c.value.align) return c.value.align === 'right'
  return c.value.role === 'user'
})

const hasAvatar = computed(() => Boolean(c.value.avatar) || Boolean(c.value.avatar?.name))

const bubbleClasses = computed(() => {
  const classes = ['dpc-bubble__body', 'min-w-0 max-w-[85%] text-sm leading-relaxed break-words']
  if (isRight.value) classes.push('rounded-2xl rounded-br-md')
  else classes.push('rounded-2xl rounded-bl-md')

  if (c.value.variant === 'none') {
    classes.push('px-0 py-0')
  } else if (c.value.variant === 'bordered') {
    classes.push(
      'border border-[var(--dpc-color-border)] bg-[var(--dpc-color-surface)] px-3.5 py-2 text-[var(--dpc-color-text)]',
    )
  } else if (isRight.value) {
    classes.push(
      'bg-[var(--dpc-color-bubble-user)] px-3.5 py-2 text-[var(--dpc-color-text-inverse)]',
    )
  } else {
    classes.push('bg-[var(--dpc-color-bubble-assistant)] px-3.5 py-2 text-[var(--dpc-color-text)]')
  }
  return classes
})

function avatarText(name?: string): string {
  return (name ?? '').trim().charAt(0).toUpperCase() || ''
}
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-bubble flex w-full"
    :class="[isRight ? 'justify-end' : 'justify-start', 'items-start gap-2']">
    <!-- 头像（assistant 靠左前，user 靠右后） -->
    <div v-if="hasAvatar"
      class="dpc-bubble__avatar flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--dpc-color-surface-muted)] text-[var(--dpc-color-text-secondary)]"
      :class="{ 'order-last': isRight }">
      <slot name="avatar">
        <img v-if="c.avatar?.imgSrc" class="h-full w-full object-cover" :src="c.avatar.imgSrc" alt="" />
        <span v-else-if="avatarText(c.avatar?.name)" class="text-xs font-semibold" aria-hidden="true">
          {{ avatarText(c.avatar?.name) }}
        </span>
        <DpcBotIcon v-else-if="c.role === 'assistant'" :size="16" />
        <DpcUserIcon v-else :size="16" />
      </slot>
    </div>

    <div class="dpc-bubble__main flex min-w-0 flex-col gap-1" :class="isRight ? 'items-end' : 'items-start'">
      <!-- 状态/来源行 -->
      <div v-if="c.statusText || $slots.status"
        class="dpc-bubble__status px-1 text-xs text-[var(--dpc-color-text-secondary)]">
        <slot name="status">{{ c.statusText }}</slot>
      </div>

      <!-- 内容主体 -->
      <div :class="bubbleClasses">
        <DpcBubbleLoading v-if="c.loading" />
        <template v-else>
          <slot name="content">{{ c.content }}</slot>
        </template>
      </div>

      <!-- 操作区（如 Toolbar） -->
      <div v-if="$slots.footer" class="dpc-bubble__footer px-1">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
