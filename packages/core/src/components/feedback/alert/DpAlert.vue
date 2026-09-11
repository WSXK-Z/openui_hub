<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps, DpType } from '../../../types'

defineOptions({ name: 'DpAlert', inheritAttrs: false })

export interface DpAlertComp {
    title: string
    closable: boolean
    showIcon: boolean
}

export type DpAlertProps = DpProps<DpAlertComp>

const props = defineProps<DpAlertProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpAlertComp>(props, {
    compDefaults: { title: '', closable: false, showIcon: true },
})

const visible = ref(true)

const TYPE_CLASSES: Record<DpType, string> = {
    default: 'border-[var(--dp-color-info)] text-[var(--dp-color-info)] bg-[color-mix(in_srgb,var(--dp-color-info)_8%,transparent)]',
    primary: 'border-[var(--dp-color-primary)] text-[var(--dp-color-primary)] bg-[color-mix(in_srgb,var(--dp-color-primary)_8%,transparent)]',
    info: 'border-[var(--dp-color-info)] text-[var(--dp-color-info)] bg-[color-mix(in_srgb,var(--dp-color-info)_8%,transparent)]',
    success:
        'border-[var(--dp-color-success)] text-[var(--dp-color-success)] bg-[color-mix(in_srgb,var(--dp-color-success)_8%,transparent)]',
    warning:
        'border-[var(--dp-color-warning)] text-[var(--dp-color-warning)] bg-[color-mix(in_srgb,var(--dp-color-warning)_8%,transparent)]',
    danger:
        'border-[var(--dp-color-danger)] text-[var(--dp-color-danger)] bg-[color-mix(in_srgb,var(--dp-color-danger)_8%,transparent)]',
}

const ICONS: Record<DpType, string> = {
    default: 'ℹ',
    primary: 'ℹ',
    info: 'ℹ',
    success: '✓',
    warning: '!',
    danger: '✕',
}

const typeClass = computed(() => TYPE_CLASSES[s.value.variant])
const icon = computed(() => ICONS[s.value.variant])
</script>

<template>
    <div v-if="visible" v-bind="rootAttrs" class="dp-alert flex items-start gap-2 rounded-[var(--dp-radius)] border p-3 text-sm"
        :class="typeClass" role="alert">
        <span v-if="c.showIcon" class="mt-0.5 text-base leading-none">{{ icon }}</span>
        <div class="min-w-0 flex-1">
            <strong v-if="c.title" class="mb-0.5 block font-semibold">{{ c.title }}</strong>
            <slot />
        </div>
        <button v-if="c.closable" class="text-base leading-none opacity-60 transition-opacity hover:opacity-100"
            type="button" aria-label="close" @click="visible = false">
            ×
        </button>
    </div>
</template>
