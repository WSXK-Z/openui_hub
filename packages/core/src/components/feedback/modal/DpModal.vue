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
    /** Esc 关闭，默认 true */
    closeOnEsc: boolean
    /** 显示右上角关闭按钮，默认 true */
    closable: boolean
}

export type DpModalProps = DpProps<DpModalComp>

const props = defineProps<DpModalProps>()

const { comp: c, rootAttrs } = useDpProps<DpModalComp>(props, {
    compDefaults: {
        title: '',
        description: '',
        width: 440,
        closeOnOverlay: true,
        closeOnEsc: true,
        closable: true,
    },
})

const open = defineModel<boolean>('open', { default: false })

function onEscapeKeyDown(event: KeyboardEvent) {
    if (!c.value.closeOnEsc) event.preventDefault()
}

const widthStyle = computed(() => ({
    width: typeof c.value.width === 'number' ? `${c.value.width}px` : c.value.width,
    maxWidth: 'calc(100vw - 32px)',
}))

const bodyClass = computed(() =>
    c.value.title ? 'px-6 pt-3 pb-6' : 'px-6 py-5',
)
</script>

<template>
    <DialogRoot v-model:open="open">
        <DialogPortal>
            <DialogOverlay
                class="dp-modal__overlay fixed inset-0 z-[1000] bg-[rgba(0,0,0,0.42)]"
                :style="{ backdropFilter: 'blur(3px)' }"
                @click="c.closeOnOverlay && (open = false)" />
            <DialogContent
                v-bind="rootAttrs"
                class="dp-modal__content fixed left-1/2 top-1/2 z-[1001] -translate-x-1/2 -translate-y-1/2 rounded-[var(--dp-radius-xl)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] p-0 text-[var(--dp-color-fg)] shadow-[var(--dp-shadow-3)]"
                :style="widthStyle" @escape-key-down="onEscapeKeyDown">
                <header v-if="c.title || $slots.header" class="flex items-center justify-between px-6 pt-5">
                    <slot name="header">
                        <DialogTitle class="text-[17px] font-semibold tracking-[-0.015em] text-[var(--dp-color-fg)]">
                            {{ c.title }}
                        </DialogTitle>
                    </slot>
                    <DialogClose v-if="c.closable"
                        class="dp-modal__close inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--dp-radius-sm)] bg-transparent text-[var(--dp-color-muted)] transition-colors duration-[140ms] hover:bg-[var(--dp-color-surface-2)] hover:text-[var(--dp-color-fg)] focus-visible:shadow-[var(--dp-ring)]"
                        aria-label="close">
                        ×
                    </DialogClose>
                </header>
                <div class="dp-modal__body" :class="bodyClass">
                    <DialogDescription v-if="c.description"
                        class="mb-2 text-[13px] leading-[1.65] text-[var(--dp-color-fg-2)]">
                        {{ c.description }}
                    </DialogDescription>
                    <slot />
                </div>
                <footer v-if="$slots.footer" class="flex justify-end gap-2 px-6 pb-6 pt-5">
                    <slot name="footer" />
                </footer>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
