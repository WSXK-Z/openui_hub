<script setup lang="ts">
import {
    TagsInputInput,
    TagsInputItem,
    TagsInputItemDelete,
    TagsInputItemText,
    TagsInputRoot,
} from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpTagsInput', inheritAttrs: false })

export interface DpTagsInputComp {
    placeholder: string
    disabled: boolean
    /** 最多标签数（0 = 不限） */
    max: number
    /** 回车 / 粘贴（按分隔符）即可新增标签 */
    addOnPaste: boolean
    addOnBlur: boolean
}

export type DpTagsInputProps = DpProps<DpTagsInputComp>

const props = defineProps<DpTagsInputProps>()

const { comp: c, rootAttrs } = useDpProps<DpTagsInputComp>(props, {
    compDefaults: { placeholder: '', disabled: false, max: 0, addOnPaste: true, addOnBlur: false },
})

const tags = defineModel<string[]>({ default: () => [] })
</script>

<template>
    <!-- 基于 reka-ui TagsInput：标签化输入（v-model string[]） -->
    <TagsInputRoot v-bind="rootAttrs" v-model="tags" :disabled="c.disabled" :max="c.max" :add-on-paste="c.addOnPaste"
        :add-on-blur="c.addOnBlur"
        class="dp-tags-input flex w-full flex-wrap items-center gap-1 rounded-[var(--dp-radius)] border border-[var(--dp-color-border-strong)] bg-[var(--dp-color-surface)] px-2 py-1 text-sm text-[var(--dp-color-fg)] transition-[border-color,box-shadow] duration-[140ms] hover:border-[var(--dp-color-fg-2)] focus-within:border-[var(--dp-color-accent)] focus-within:shadow-[var(--dp-ring)]">
        <TagsInputItem v-for="t in tags" :key="t" :value="t"
            class="dp-tags-input__item inline-flex items-center gap-1 rounded-[var(--dp-radius-sm)] bg-[var(--dp-color-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--dp-color-accent)]">
            <TagsInputItemText class="text-[11px]">{{ t }}</TagsInputItemText>
            <TagsInputItemDelete :aria-label="`移除 ${t}`"
                class="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded bg-transparent text-xs leading-none hover:bg-[color-mix(in_srgb,var(--dp-color-accent)_16%,transparent)]">
                ×
            </TagsInputItemDelete>
        </TagsInputItem>
        <TagsInputInput :placeholder="c.placeholder"
            class="min-w-20 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-[var(--dp-color-muted)]" />
    </TagsInputRoot>
</template>
