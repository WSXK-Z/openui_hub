<script setup lang="ts">
import {
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionRoot,
    AccordionTrigger,
} from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpAccordion', inheritAttrs: false })

export interface DpAccordionItem {
    /** 唯一值（v-model active 也用它） */
    value: string
    title: string
    content?: string
    disabled?: boolean
}

export interface DpAccordionComp {
    items: DpAccordionItem[]
    /** 允许全部收起 */
    collapsible: boolean
}

export type DpAccordionProps = DpProps<DpAccordionComp>

const props = defineProps<DpAccordionProps>()

const { comp: c, rootAttrs } = useDpProps<DpAccordionComp>(props, {
    compDefaults: { items: [], collapsible: true },
})

/** 当前展开项 value（single；'' = 无展开） */
const active = defineModel<string>({ default: '' })
</script>

<template>
    <!-- 基于 reka-ui Accordion：单开手风琴（v-model active=value），内容可用具名插槽 item-<value> 覆盖 -->
    <AccordionRoot v-bind="rootAttrs" v-model="active" type="single" :collapsible="c.collapsible"
        class="dp-accordion w-full overflow-hidden rounded-[var(--dp-radius-lg)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] text-[var(--dp-color-fg)]">
        <AccordionItem v-for="item in c.items" :key="item.value" :value="item.value" :disabled="item.disabled"
            class="dp-accordion__item border-t border-[var(--dp-color-border)] first:border-t-0">
            <AccordionHeader class="dp-accordion__header m-0">
                <AccordionTrigger
                    class="dp-accordion__trigger flex w-full cursor-pointer items-center justify-between gap-2 bg-transparent px-4 py-3 text-left text-sm font-medium text-[var(--dp-color-fg)] outline-none transition-colors duration-[140ms] hover:bg-[var(--dp-color-surface-2)] focus-visible:shadow-[var(--dp-ring)] disabled:cursor-not-allowed disabled:opacity-50">
                    <span class="min-w-0 truncate">{{ item.title }}</span>
                    <span class="dp-accordion__arrow shrink-0 text-xs text-[var(--dp-color-muted)]">▾</span>
                </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent
                class="dp-accordion__content overflow-hidden px-4 pb-3 text-[13px] leading-6 text-[var(--dp-color-fg-2)]">
                <slot :name="`item-${item.value}`" :item="item">{{ item.content ?? '' }}</slot>
            </AccordionContent>
        </AccordionItem>
    </AccordionRoot>
</template>

<style scoped>
.dp-accordion__trigger[data-state='open'] .dp-accordion__arrow {
    transform: rotate(180deg);
}
</style>
