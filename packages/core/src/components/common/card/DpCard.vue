<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpCard', inheritAttrs: false })

export interface DpCardComp {
    title: string
    hoverable: boolean
    padding: 'none' | 'small' | 'default' | 'large'
}

export type DpCardProps = DpProps<DpCardComp>

const props = defineProps<DpCardProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpCardComp>(props, {
    compDefaults: { title: '', hoverable: false, padding: 'default' },
    themeDefaults: { bordered: true },
})

const bodyPadding = computed(() =>
    c.value.padding === 'none'
        ? 'p-0'
        : c.value.padding === 'small'
            ? 'p-3'
            : c.value.padding === 'large'
                ? 'p-6'
                : 'p-4',
)
</script>

<template>
    <section v-bind="rootAttrs" class="dp-card rounded-[var(--dp-radius-md)] bg-[var(--dp-color-surface)]" :class="[
        s.bordered && 'border border-[var(--dp-color-border)]',
        c.hoverable && 'transition-shadow hover:shadow-md',
    ]">
        <header v-if="c.title || $slots.header"
            class="dp-card__header flex items-center justify-between border-b border-[var(--dp-color-border)] px-4 py-3">
            <slot name="header">
                <span class="dp-card__title text-sm font-semibold">{{ c.title }}</span>
            </slot>
        </header>
        <div class="dp-card__body" :class="bodyPadding">
            <slot />
        </div>
    </section>
</template>
