<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import { useDpcLocale } from '../Locale/localeContext'
import { DpcSendIcon, DpcStopIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcSender', inheritAttrs: false })

export type DpcSubmitShortKey = 'enter' | 'shift-enter' | null
export type DpcSenderAutosize = boolean | { minRows?: number; maxRows?: number }

export interface DpcSenderComp {
  /** 占位文本（缺省用 locale 文案） */
  placeholder: string
  /** 禁用（textarea + 发送钮） */
  disabled: boolean
  /** 生成中：发送钮切换为「停止」 */
  loading: boolean
  /** 挂载后自动聚焦 */
  autoFocus: boolean
  /** 发送成功后清空输入 */
  autoClear: boolean
  /** 最大长度（配合 showCount） */
  maxLength: number | null
  /** 显示字符计数 */
  showCount: boolean
  /** 提交快捷键：enter=回车发送 / shift-enter=Shift+回车发送 / null=仅按钮发送 */
  submitShortKey: DpcSubmitShortKey
  /** 高度自适应：true 或 { minRows, maxRows } */
  autosize: DpcSenderAutosize
  /** 外框卡片样式（false 为无边框悬浮态） */
  bordered: boolean
}

export type DpcSenderProps = DpcProps<DpcSenderComp>

const props = defineProps<DpcSenderProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcSenderComp>(props, {
  compDefaults: {
    placeholder: '',
    disabled: false,
    loading: false,
    autoFocus: false,
    autoClear: true,
    maxLength: null,
    showCount: false,
    submitShortKey: 'enter',
    autosize: true,
    bordered: true,
  },
})

const emit = defineEmits<{
  /** 提交消息（内容已 trim） */
  (e: 'send', content: string): void
  /** 生成中点击「停止」 */
  (e: 'stop'): void
}>()

const locale = useDpcLocale()
const model = defineModel<string>({ default: '' })

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const LINE_HEIGHT = 22

const autosizeConfig = computed<{ minRows: number; maxRows: number } | null>(() => {
  const raw = c.value.autosize
  if (raw === false) return null
  const cfg = raw === true ? {} : raw
  return { minRows: cfg.minRows ?? 1, maxRows: cfg.maxRows ?? 5 }
})

const resolvedPlaceholder = computed(() => c.value.placeholder || locale.placeholder)

const countText = computed(() =>
  c.value.maxLength != null
    ? `${model.value.length}/${c.value.maxLength}`
    : `${model.value.length}`,
)

function resizeTextarea() {
  const ta = textareaRef.value
  if (!ta) return
  ta.style.height = 'auto'
  const cfg = autosizeConfig.value
  let height = ta.scrollHeight
  if (cfg) {
    const min = cfg.minRows * LINE_HEIGHT
    const max = cfg.maxRows * LINE_HEIGHT
    height = Math.min(Math.max(height, min), max)
    ta.style.overflowY = height >= max ? 'auto' : 'hidden'
  } else {
    ta.style.overflowY = 'hidden'
  }
  ta.style.height = `${height}px`
}

function onInput(event: Event) {
  model.value = (event.target as HTMLTextAreaElement).value
  resizeTextarea()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || c.value.submitShortKey === null) return
  const sendWithShift = c.value.submitShortKey === 'shift-enter'
  const shouldSend = event.shiftKey === sendWithShift
  if (shouldSend) {
    event.preventDefault()
    submit()
  }
}

function submit() {
  if (c.value.loading || c.value.disabled) return
  const content = model.value.trim()
  if (!content) return
  emit('send', content)
  if (c.value.autoClear) {
    model.value = ''
    void nextTick(resizeTextarea)
  }
}

function handleSendClick() {
  if (c.value.loading) {
    emit('stop')
    return
  }
  submit()
}

const sendDisabled = computed(
  () => c.value.disabled || (!c.value.loading && model.value.trim().length === 0),
)

function focus() {
  textareaRef.value?.focus()
}

watch(model, () => {
  void nextTick(resizeTextarea)
})

onMounted(() => {
  void nextTick(() => {
    resizeTextarea()
    if (c.value.autoFocus) focus()
  })
})

defineExpose({ focus, submit, resizeTextarea })
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-sender flex w-full flex-none flex-col">
    <slot name="toolbar" />

    <div class="dpc-sender__card flex w-full items-end gap-2 bg-[var(--dpc-color-surface)] p-3" :class="c.bordered
      ? 'border border-[var(--dpc-color-border)] rounded-[var(--dpc-radius-xl)] shadow-sm'
      : 'rounded-[var(--dpc-radius-xl)]'
      ">
      <slot name="prefix" />

      <div class="dpc-sender__field flex min-w-0 flex-1 flex-col">
        <textarea ref="textareaRef"
          class="dpc-sender__textarea w-full resize-none bg-transparent px-1 text-sm leading-[22px] text-[var(--dpc-color-text)] outline-none placeholder:text-[var(--dpc-color-text-secondary)] disabled:opacity-55"
          rows="1" :value="model" :placeholder="resolvedPlaceholder" :disabled="c.disabled"
          :maxlength="c.maxLength ?? undefined" :readonly="c.loading" aria-label="chat input" @input="onInput"
          @keydown="onKeydown" />

        <div v-if="c.showCount || $slots.hint"
          class="dpc-sender__meta flex items-center justify-between gap-2 px-1 pt-0.5 text-xs text-[var(--dpc-color-text-secondary)]">
          <span class="min-w-0 flex-1">
            <slot name="hint" />
          </span>
          <span v-if="c.showCount" class="dpc-sender__count shrink-0">{{ countText }}</span>
        </div>
      </div>

      <div class="dpc-sender__actions flex shrink-0 items-end gap-1">
        <slot name="actions" />

        <DpButton class="dpc-sender__send" :theme="{
          variant: c.loading ? 'danger' : 'primary',
          size: 'small',
          round: true,
          icon: true,
          cssVars: { '--dp-size-btn-h-sm': '36px' },
        }" :comp="{ disabled: sendDisabled && !c.loading }" :aria-label="c.loading ? locale.stop : locale.send"
          @click="handleSendClick">
          <DpcStopIcon v-if="c.loading" :size="14" />
          <DpcSendIcon v-else :size="16" />
        </DpButton>
      </div>
    </div>

    <slot name="footer" />
  </div>
</template>
