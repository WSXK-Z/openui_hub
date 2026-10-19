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

const emit = defineEmits<{ (e: 'close', event: MouseEvent): void }>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpAlertComp>(props, {
    compDefaults: { title: '', closable: false, showIcon: true },
})

const visible = ref(true)

function close(event: MouseEvent) {
    visible.value = false
    emit('close', event)
}

const TYPE_CLASSES: Record<DpType, string> = {
    default:
        'border-[color-mix(in_srgb,var(--dp-color-info)_35%,transparent)] text-[var(--dp-color-info)] bg-[color-mix(in_srgb,var(--dp-color-info)_8%,transparent)]',
    primary:
        'border-[color-mix(in_srgb,var(--dp-color-accent)_35%,transparent)] text-[var(--dp-color-accent)] bg-[var(--dp-color-accent-soft)]',
    info: 'border-[color-mix(in_srgb,var(--dp-color-info)_35%,transparent)] text-[var(--dp-color-info)] bg-[color-mix(in_srgb,var(--dp-color-info)_8%,transparent)]',
    success:
        'border-[color-mix(in_srgb,var(--dp-color-ok)_35%,transparent)] text-[var(--dp-color-ok)] bg-[color-mix(in_srgb,var(--dp-color-ok)_10%,transparent)]',
    warning:
        'border-[color-mix(in_srgb,var(--dp-color-warn)_35%,transparent)] text-[var(--dp-color-warn)] bg-[color-mix(in_srgb,var(--dp-color-warn)_12%,transparent)]',
    danger:
        'border-[color-mix(in_srgb,var(--dp-color-danger)_35%,transparent)] text-[var(--dp-color-danger)] bg-[color-mix(in_srgb,var(--dp-color-danger)_10%,transparent)]',
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
    <div v-if="visible" v-bind="rootAttrs" class="dp-alert flex items-start gap-2 rounded-[var(--dp-radius-md)] border p-3 text-[13px]"
        :class="typeClass" role="alert">
        <span v-if="c.showIcon" class="mt-0.5 text-base leading-none">{{ icon }}</span>
        <div class="min-w-0 flex-1">
            <strong v-if="c.title" class="mb-0.5 block font-semibold">{{ c.title }}</strong>
            <slot />
        </div>
        <button v-if="c.closable"
            class="cursor-pointer bg-transparent text-base leading-none opacity-60 transition-opacity hover:opacity-100"
            type="button" aria-label="close" @click="close">
            ×
        </button>
    </div>
</template>
