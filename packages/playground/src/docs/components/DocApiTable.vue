<script setup lang="ts">
import { computed } from 'vue'
import { DpTable } from '@dp_ui/core'
import type { DemoApiRow } from '../registry'

const props = defineProps<{
    title: string
    rows: DemoApiRow[]
}>()

const columns = [
    { key: 'name', title: '名称', width: 168 },
    { key: 'type', title: '类型' },
    { key: 'def', title: '默认值', width: 120 },
    { key: 'desc', title: '说明' },
]

const data = computed(() =>
    props.rows.map((row) => ({
        name: row.name,
        type: row.type,
        def: row.def ?? '—',
        desc: row.desc,
    })),
)
</script>

<template>
    <section class="mt-8">
        <h3 class="m-0 mb-2 text-[15px] font-medium text-[var(--dp-color-fg)]">{{ title }}</h3>
        <DpTable :comp="{ columns, data, rowKey: 'name', size: 'small' }" :theme="{ bordered: true }">
            <template #td-name="{ row }">
                <span class="font-mono text-[12.5px] text-[var(--dp-color-accent)]">{{ row.name }}</span>
            </template>
            <template #td-type="{ row }">
                <span class="font-mono text-xs leading-5 text-[var(--dp-color-fg-2)]">{{ row.type }}</span>
            </template>
            <template #td-def="{ row }">
                <span class="font-mono text-xs text-[var(--dp-color-fg-2)]">{{ row.def }}</span>
            </template>
            <template #td-desc="{ row }">
                <span class="text-xs leading-5 text-[var(--dp-color-fg-2)]">{{ row.desc }}</span>
            </template>
        </DpTable>
    </section>
</template>
