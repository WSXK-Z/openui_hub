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
                : 'p-5',
)
</script>

<template>
    <section v-bind="rootAttrs"
        class="dp-card rounded-[var(--dp-radius-lg)] bg-[var(--dp-color-surface)] text-[var(--dp-color-fg)]" :class="[
        s.bordered && 'border border-[var(--dp-color-border)]',
        c.hoverable &&
            'transition-[border-color,box-shadow] duration-[140ms] hover:border-[var(--dp-color-border-strong)] hover:shadow-[var(--dp-shadow-2)]',
    ]">
        <div v-if="$slots.cover" class="dp-card__cover overflow-hidden rounded-t-[var(--dp-radius-lg)]">
            <slot name="cover" />
        </div>
        <header v-if="c.title || $slots.header || $slots['header-extra']"
            class="dp-card__header flex items-center justify-between gap-3 border-b border-[var(--dp-color-border)] px-5 py-3">
            <slot name="header">
                <span class="dp-card__title text-sm font-semibold">{{ c.title }}</span>
            </slot>
            <div v-if="$slots['header-extra']" class="dp-card__header-extra shrink-0">
                <slot name="header-extra" />
            </div>
        </header>
        <div class="dp-card__body" :class="bodyPadding">
            <slot />
        </div>
        <footer v-if="$slots.footer"
            class="dp-card__footer border-t border-[var(--dp-color-border)] px-5 py-3">
            <slot name="footer" />
        </footer>
    </section>
</template>
