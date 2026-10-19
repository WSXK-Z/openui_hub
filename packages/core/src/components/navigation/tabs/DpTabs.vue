<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpThemeProps } from '../../../types'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

defineOptions({ name: 'DpTabs', inheritAttrs: false })

export interface DpTabsItem {
    label: string
    value: string
    content?: string
}

export interface DpTabsComp {
    items: DpTabsItem[]
    defaultValue: string
}

/** 标签页外观扩展：三种视觉形态 */
export interface DpTabsTheme extends DpThemeProps {
    type?: 'line' | 'segment' | 'card'
}

export type DpTabsProps = {
    theme?: DpTabsTheme
    comp?: Partial<DpTabsComp>
}

const props = defineProps<DpTabsProps>()

const { comp: c, rootAttrs } = useDpProps<DpTabsComp>(props, {
    compDefaults: { items: [], defaultValue: '' },
})

const model = defineModel<string>({ default: '' })

const tabType = computed(() => props.theme?.type ?? 'segment')

const listClass = computed(() => {
    switch (tabType.value) {
        case 'line':
            return 'gap-4 border-b border-[var(--dp-color-border)]'
        case 'card':
            return 'gap-0 border-b border-[var(--dp-color-border)]'
        default:
            return 'gap-[2px] rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface-2)] p-[3px]'
    }
})

const triggerClass = computed(() => {
    const base =
        'dp-tabs__trigger cursor-pointer text-xs font-medium text-[var(--dp-color-muted)] outline-none transition-[background-color,border-color,color,box-shadow] duration-[140ms] hover:text-[var(--dp-color-fg)] focus-visible:shadow-[var(--dp-ring)]'
    switch (tabType.value) {
        case 'line':
            return `${base} h-9 rounded-none border-b-2 border-transparent bg-transparent px-1 data-[state=active]:border-[var(--dp-color-accent)] data-[state=active]:text-[var(--dp-color-accent)]`
        case 'card':
            return `${base} h-9 rounded-t-[var(--dp-radius-sm)] border border-transparent border-b-0 bg-transparent px-3 data-[state=active]:border-[var(--dp-color-border)] data-[state=active]:bg-[var(--dp-color-surface)] data-[state=active]:text-[var(--dp-color-fg)]`
        default:
            return `${base} h-[30px] rounded-[var(--dp-radius-sm)] bg-transparent px-3 data-[state=active]:bg-[var(--dp-color-surface)] data-[state=active]:text-[var(--dp-color-fg)] data-[state=active]:shadow-[var(--dp-shadow-1)]`
    }
})

const contentClass = computed(() =>
    tabType.value === 'card'
        ? 'rounded-b-[var(--dp-radius-sm)] border border-t-0 border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] p-4'
        : 'p-4',
)

const activeValue = computed(() => model.value || c.value.defaultValue || (c.value.items[0]?.value ?? ''))

function onUpdate(value: string) {
    model.value = value
}
</script>

<template>
    <TabsRoot v-bind="rootAttrs" :model-value="activeValue" @update:model-value="onUpdate"
        class="dp-tabs" :class="`dp-tabs--${tabType}`">
        <TabsList class="dp-tabs__list inline-flex" :class="listClass">
            <TabsTrigger v-for="item in c.items" :key="item.value" :value="item.value"
                :class="['dp-tabs__trigger', triggerClass]">
                {{ item.label }}
            </TabsTrigger>
        </TabsList>
        <TabsContent v-for="item in c.items" :key="item.value" :value="item.value" class="dp-tabs__content"
            :class="contentClass">
            <slot :name="item.value">{{ item.content }}</slot>
        </TabsContent>
    </TabsRoot>
</template>
