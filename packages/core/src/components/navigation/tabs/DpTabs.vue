<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
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

export type DpTabsProps = DpProps<DpTabsComp>

const props = defineProps<DpTabsProps>()

const { comp: c, rootAttrs } = useDpProps<DpTabsComp>(props, {
    compDefaults: { items: [], defaultValue: '' },
})

const model = defineModel<string>({ default: '' })

const activeValue = computed(() => model.value || c.value.defaultValue || (c.value.items[0]?.value ?? ''))

function onUpdate(value: string) {
    model.value = value
}
</script>

<template>
    <TabsRoot v-bind="rootAttrs" :model-value="activeValue" @update:model-value="onUpdate" class="dp-tabs">
        <TabsList class="dp-tabs__list flex gap-1 border-b border-[var(--dp-color-border)]">
            <TabsTrigger v-for="item in c.items" :key="item.value" :value="item.value"
                class="dp-tabs__trigger -mb-px border-b-2 px-4 py-2 text-sm outline-none transition-colors data-[state=active]:border-[var(--dp-color-primary)] data-[state=active]:text-[var(--dp-color-primary)] data-[state=inactive]:border-transparent data-[state=inactive]:text-[var(--dp-color-text-secondary)] hover:text-[var(--dp-color-text)]">
                {{ item.label }}
            </TabsTrigger>
        </TabsList>
        <TabsContent v-for="item in c.items" :key="item.value" :value="item.value" class="dp-tabs__content p-4">
            <slot :name="item.value">{{ item.content }}</slot>
        </TabsContent>
    </TabsRoot>
</template>
