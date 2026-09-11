<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpTextarea', inheritAttrs: false })

export interface DpTextareaComp {
    placeholder: string
    label: string
    disabled: boolean
    readonly: boolean
    rows: number
    resize: boolean
}

export type DpTextareaProps = DpProps<DpTextareaComp>

const props = defineProps<DpTextareaProps>()

const { comp: c, rootAttrs } = useDpProps<DpTextareaComp>(props, {
    compDefaults: { placeholder: '', label: '', disabled: false, readonly: false, rows: 3, resize: true },
})

const model = defineModel<string>({ default: '' })

function onInput(event: Event) {
    model.value = (event.target as HTMLTextAreaElement).value
}
</script>

<template>
    <div v-bind="rootAttrs" class="dp-textarea flex w-full flex-col gap-1">
        <label v-if="c.label" class="text-[13px] text-[var(--dp-color-text-secondary)]">{{ c.label }}</label>
        <textarea
            class="dp-textarea__inner w-full rounded-[var(--dp-radius)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] p-3 text-sm outline-none transition-colors focus:border-[var(--dp-color-primary)] disabled:opacity-55"
            :class="{ 'resize-y': c.resize, 'resize-none': !c.resize }" :value="model"
            :placeholder="c.placeholder" :disabled="c.disabled" :readonly="c.readonly" :rows="c.rows"
            @input="onInput" />
    </div>
</template>
