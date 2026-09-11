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
        class="dp-tags-input flex w-full flex-wrap items-center gap-1 rounded-[var(--dp-radius)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] px-2 py-1 text-sm transition-colors focus-within:border-[var(--dp-color-primary)]">
        <TagsInputItem v-for="t in tags" :key="t" :value="t"
            class="dp-tags-input__item inline-flex items-center gap-1 rounded-[var(--dp-radius-sm)] bg-[color-mix(in_srgb,var(--dp-color-primary)_10%,transparent)] px-2 py-0.5 text-[var(--dp-color-primary)]">
            <TagsInputItemText class="text-sm">{{ t }}</TagsInputItemText>
            <TagsInputItemDelete :aria-label="`移除 ${t}`"
                class="inline-flex h-4 w-4 items-center justify-center rounded text-xs leading-none hover:bg-[color-mix(in_srgb,var(--dp-color-primary)_20%,transparent)]">
                ×
            </TagsInputItemDelete>
        </TagsInputItem>
        <TagsInputInput :placeholder="c.placeholder"
            class="min-w-20 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-[var(--dp-color-text-secondary)]" />
    </TagsInputRoot>
</template>
