<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
} from 'reka-ui'

defineOptions({ name: 'DpModal', inheritAttrs: false })

export interface DpModalComp {
    title: string
    description: string
    width: number | string
    closeOnOverlay: boolean
}

export type DpModalProps = DpProps<DpModalComp>

const props = defineProps<DpModalProps>()

const { comp: c, rootAttrs } = useDpProps<DpModalComp>(props, {
    compDefaults: { title: '', description: '', width: 480, closeOnOverlay: true },
})

const open = defineModel<boolean>('open', { default: false })

const widthStyle = computed(() => ({
    width: typeof c.value.width === 'number' ? `${c.value.width}px` : c.value.width,
}))
</script>

<template>
    <DialogRoot v-model:open="open">
        <DialogPortal>
            <DialogOverlay class="dp-modal__overlay fixed inset-0 z-[1000] bg-black/50"
                @click="c.closeOnOverlay && (open = false)" />
            <DialogContent
                v-bind="rootAttrs"
                class="dp-modal__content fixed left-1/2 top-1/2 z-[1001] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[var(--dp-radius-md)] bg-[var(--dp-color-surface)] p-4 shadow-lg"
                :style="widthStyle">
                <header v-if="c.title || $slots.header" class="mb-3 flex items-center justify-between">
                    <slot name="header">
                        <DialogTitle class="text-base font-semibold">{{ c.title }}</DialogTitle>
                    </slot>
                    <DialogClose
                        class="dp-modal__close inline-flex h-6 w-6 items-center justify-center rounded-[var(--dp-radius-sm)] text-[var(--dp-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--dp-color-border)_40%,transparent)]"
                        aria-label="close">
                        ×
                    </DialogClose>
                </header>
                <div class="dp-modal__body">
                    <DialogDescription v-if="c.description" class="mb-2 text-sm text-[var(--dp-color-text-secondary)]">
                        {{ c.description }}
                    </DialogDescription>
                    <slot />
                </div>
                <footer v-if="$slots.footer" class="mt-4 flex justify-end gap-2">
                    <slot name="footer" />
                </footer>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
