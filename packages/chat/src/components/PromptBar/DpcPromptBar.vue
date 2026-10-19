<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import AgentIcon from '../../internal/AgentIcon.vue'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcPromptBar', inheritAttrs: false })

export interface DpcPromptModel {
  key: string
  name: string
  /** 模型档位说明（Flagship / Basic …） */
  tag?: string
}

export type DpcPromptBarVariant = 'Rounded' | 'Pill'

export interface DpcPromptBarComp {
  placeholder: string
  /** 可选模型 */
  models: DpcPromptModel[]
  /** 当前模型 key；留空取第一个 */
  model: string
  disabled: boolean
  /** 生成中：发送钮切换为停止 */
  loading: boolean
  /** Rounded 为卡片圆角，Pill 为全圆角 */
  variant: DpcPromptBarVariant
  /** 已附加的文件名 */
  attachments: string[]
  /** 显示模型选择器 */
  showModelPicker: boolean
  /** 提交快捷键 */
  submitShortKey: 'enter' | 'shift-enter'
  /** 最大行数（自适应高度） */
  maxRows: number
}

export type DpcPromptBarProps = DpcProps<DpcPromptBarComp>

const props = defineProps<DpcPromptBarProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcPromptBarComp>(props, {
  compDefaults: {
    placeholder: 'Ask anything…',
    models: [],
    model: '',
    disabled: false,
    loading: false,
    variant: 'Rounded',
    attachments: [],
    showModelPicker: true,
    submitShortKey: 'enter',
    maxRows: 5,
  },
})

const emit = defineEmits<{
  /** 提交输入（已 trim） */
  (e: 'send', text: string): void
  /** 生成中点击停止 */
  (e: 'stop'): void
  /** 模型切换 */
  (e: 'modelChange', key: string): void
  /** 点击附件按钮 */
  (e: 'attach'): void
  /** 移除附件 */
  (e: 'removeAttachment', index: number): void
}>()

const text = defineModel<string>({ default: '' })

const rootRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const modelOpen = ref(false)

const currentModel = computed<DpcPromptModel | undefined>(() => {
  const key = c.value.model || c.value.models[0]?.key
  return c.value.models.find((item) => item.key === key) ?? c.value.models[0]
})

const canSend = computed(
  () => !c.value.disabled && !c.value.loading && text.value.trim().length > 0,
)

const LINE_HEIGHT = 22

function resizeTextarea() {
  const ta = textareaRef.value
  if (!ta) return
  ta.style.height = 'auto'
  const max = c.value.maxRows * LINE_HEIGHT
  const height = Math.min(ta.scrollHeight, max)
  ta.style.height = `${height}px`
  ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden'
}

watch(text, () => {
  void nextTick(resizeTextarea)
})

onMounted(() => {
  void nextTick(resizeTextarea)
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

function onDocumentClick(event: MouseEvent) {
  if (!modelOpen.value) return
  if (!rootRef.value?.contains(event.target as Node)) modelOpen.value = false
}

function submit() {
  if (!canSend.value) return
  emit('send', text.value.trim())
}

function onSendClick() {
  if (c.value.loading) {
    emit('stop')
    return
  }
  submit()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    modelOpen.value = false
    return
  }
  if (event.key !== 'Enter') return
  const sendWithShift = c.value.submitShortKey === 'shift-enter'
  if (event.shiftKey === sendWithShift) {
    event.preventDefault()
    submit()
  }
}

function selectModel(key: string) {
  modelOpen.value = false
  emit('modelChange', key)
}

const radius = computed(() => (c.value.variant === 'Pill' ? '9999px' : 'var(--dpc-radius-card)'))

function attachmentName(index: number): string {
  return c.value.attachments[index] ?? ''
}
</script>

<template>
  <div
    ref="rootRef"
    v-bind="rootAttrs"
    class="dpc-prompt-bar relative flex w-full flex-col gap-2 bg-[var(--dpc-color-surface)] p-2.5 transition-colors duration-150 focus-within:border-[var(--dpc-color-line-strong)]"
    :style="{
      borderRadius: radius,
      border: '1px solid var(--dpc-color-line)',
      boxShadow: 'var(--dpc-shadow-card)',
    }"
  >
    <!-- 附件 -->
    <div v-if="c.attachments.length" class="flex flex-wrap gap-1.5 px-0.5">
      <span
        v-for="(name, index) in c.attachments"
        :key="`${name}-${index}`"
        class="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full bg-[var(--dpc-color-inset)] px-2 text-[11.5px] text-[var(--dpc-color-ink-2)]"
        :style="{ boxShadow: 'var(--dpc-shadow-hairline)' }"
      >
        <AgentIcon name="file" :size="11" :stroke-width="2.2" class="shrink-0" />
        <span class="dpc-mono truncate">{{ attachmentName(index) }}</span>
        <button
          type="button"
          class="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-transparent text-[var(--dpc-color-ink-3)] transition-colors hover:bg-[var(--dpc-color-hover-2)] hover:text-[var(--dpc-color-ink)]"
          :aria-label="`Remove ${attachmentName(index)}`"
          @click="emit('removeAttachment', index)"
        >
          <AgentIcon name="close" :size="9" :stroke-width="2.6" />
        </button>
      </span>
    </div>

    <textarea
      ref="textareaRef"
      v-model="text"
      class="dpc-prompt-bar__input w-full resize-none bg-transparent px-1 text-[13px] leading-[22px] text-[var(--dpc-color-ink)] outline-none placeholder:text-[var(--dpc-color-ink-3)] disabled:opacity-55"
      rows="1"
      :placeholder="c.placeholder"
      :disabled="c.disabled"
      :readonly="c.loading"
      aria-label="Prompt"
      @input="resizeTextarea"
      @keydown="onKeydown"
    />

    <div class="flex items-end justify-between gap-2">
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="dpc-icon-button cursor-pointer bg-transparent text-[var(--dpc-color-ink-3)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)] hover:text-[var(--dpc-color-ink-2)] disabled:cursor-default disabled:opacity-40"
          aria-label="Attach files"
          :disabled="c.disabled"
          @click="emit('attach')"
        >
          <AgentIcon name="paperclip" :size="15" />
        </button>

        <div v-if="c.showModelPicker && c.models.length" class="relative">
          <button
            type="button"
            class="flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-transparent px-2 text-[11.5px] font-medium text-[var(--dpc-color-ink-2)] transition-colors duration-100 hover:bg-[var(--dpc-color-hover-2)]"
            :aria-expanded="modelOpen"
            @click="modelOpen = !modelOpen"
          >
            <span class="dpc-mono">{{ currentModel?.name ?? 'Model' }}</span>
            <AgentIcon
              name="chevron-down"
              :size="11"
              :stroke-width="2.2"
              class="transition-transform duration-150"
              :style="{ transform: modelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }"
            />
          </button>

          <div
            v-if="modelOpen"
            class="absolute bottom-full left-0 z-50 mb-1.5 w-56 overflow-hidden rounded-[10px] bg-[var(--dpc-color-surface)] p-1"
            :style="{
              boxShadow: 'var(--dpc-shadow-overlay)',
              animation: 'dpc-pop-in 160ms cubic-bezier(0.23, 1, 0.32, 1) both',
              transformOrigin: 'bottom left',
            }"
          >
            <button
              v-for="model in c.models"
              :key="model.key"
              type="button"
              class="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition-colors duration-100 hover:bg-[var(--dpc-color-hover)]"
              :class="
                model.key === currentModel?.key ? 'bg-[var(--dpc-color-inset)]' : 'bg-transparent'
              "
              @click="selectModel(model.key)"
            >
              <span
                class="dpc-mono min-w-0 flex-1 truncate text-[12px] text-[var(--dpc-color-ink)]"
              >
                {{ model.name }}
              </span>
              <span v-if="model.tag" class="shrink-0 text-[11px] text-[var(--dpc-color-ink-3)]">
                {{ model.tag }}
              </span>
              <AgentIcon
                v-if="model.key === currentModel?.key"
                name="check"
                :size="12"
                :stroke-width="2.6"
                class="shrink-0 text-[var(--dpc-color-ink-2)]"
              />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="dpc-prompt-bar__send flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--dpc-color-ink)] text-[var(--dpc-color-canvas)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-95 disabled:cursor-default disabled:opacity-35"
        :aria-label="c.loading ? 'Stop' : 'Send'"
        :disabled="!c.loading && (!canSend || c.disabled)"
        @click="onSendClick"
      >
        <AgentIcon :name="c.loading ? 'stop' : 'send'" :size="14" :stroke-width="2.2" />
      </button>
    </div>
  </div>
</template>
