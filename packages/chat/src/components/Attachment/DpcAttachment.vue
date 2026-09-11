<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
import { ref } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import { useDpcLocale } from '../Locale/localeContext'
import { DpcPaperclipIcon } from '../../internal/icons'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcAttachment', inheritAttrs: false })

export interface DpcAttachmentComp {
  /** 允许的文件类型（原生 accept） */
  accept: string
  /** 是否多选 */
  multiple: boolean
  /** 禁用 */
  disabled: boolean
}

export type DpcAttachmentProps = DpcProps<DpcAttachmentComp>

const props = defineProps<DpcAttachmentProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcAttachmentComp>(props, {
  compDefaults: { accept: '', multiple: false, disabled: false },
})

const emit = defineEmits<{
  (e: 'change', files: File[]): void
}>()

const locale = useDpcLocale()
const inputRef = ref<HTMLInputElement | null>(null)

function pick() {
  if (c.value.disabled) return
  inputRef.value?.click()
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length > 0) emit('change', files)
  // 允许再次选择同一文件
  input.value = ''
}

defineExpose({ pick })
</script>

<template>
  <!-- 附件选择（隐藏 input + 触发按钮） -->
  <div v-bind="rootAttrs" class="dpc-attachment inline-flex">
    <slot :pick="pick">
      <DpButton class="dpc-attachment__trigger" :theme="{
        variant: 'default',
        size: 'small',
        round: true,
        ghost: true,
        icon: true,
      }" :comp="{ disabled: c.disabled }" :aria-label="locale.attachment" @click="pick">
        <DpcPaperclipIcon :size="18" />
      </DpButton>
    </slot>
    <input ref="inputRef" type="file" class="dpc-attachment__input hidden" :accept="c.accept" :multiple="c.multiple"
      :disabled="c.disabled" @change="onChange" />
  </div>
</template>
