<script setup lang="ts">
import { computed } from 'vue'
import DpSpin from '../../feedback/spin/DpSpin.vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpTable', inheritAttrs: false })

export type DpTableAlign = 'left' | 'center' | 'right'

export interface DpTableColumn {
    key: string
    title?: string
    width?: number | string
    align?: DpTableAlign
}

export interface DpTableComp {
    columns: DpTableColumn[]
    data: Array<Record<string, unknown>>
    rowKey: string | ((row: Record<string, unknown>, index: number) => string | number) | undefined
    loading: boolean
    striped: boolean
    size: 'small' | 'default' | 'large'
    emptyText: string
}

export type DpTableProps = DpProps<DpTableComp>

const props = defineProps<DpTableProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpTableComp>(props, {
    compDefaults: {
        columns: [],
        data: [],
        loading: false,
        striped: false,
        size: 'default',
        emptyText: '暂无数据',
    },
    themeDefaults: { bordered: false },
})

const cellPad = computed(() =>
    c.value.size === 'small' ? 'px-2.5 py-1.5' : c.value.size === 'large' ? 'px-4 py-3' : 'px-3 py-2',
)

function rowKeyOf(row: Record<string, unknown>, index: number): string | number {
    if (typeof c.value.rowKey === 'function') return c.value.rowKey(row, index)
    if (typeof c.value.rowKey === 'string') return String(row[c.value.rowKey])
    return index
}

function cellValue(row: Record<string, unknown>, key: string): unknown {
    return row[key]
}

function colStyle(col: DpTableColumn): Record<string, string> | undefined {
    if (col.width === undefined || col.width === null) return undefined
    return { width: typeof col.width === 'number' ? `${col.width}px` : col.width }
}
</script>

<template>
    <div v-bind="rootAttrs" class="dp-table w-full overflow-x-auto">
        <table class="dp-table__inner w-full border-collapse text-sm"
            :class="{ 'border border-[var(--dp-color-border)]': s.bordered }">
            <thead>
                <tr class="bg-[color-mix(in_srgb,var(--dp-color-border)_30%,transparent)]">
                    <th v-for="col in c.columns" :key="col.key"
                        class="px-3 py-2 font-medium text-[var(--dp-color-text-secondary)]" :class="[
                            cellPad,
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center',
                            col.align !== 'right' && col.align !== 'center' && 'text-left',
                        ]" :style="colStyle(col)">
                        <slot :name="`th-${col.key}`" :column="col">{{ col.title ?? col.key }}</slot>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="c.loading">
                    <td :colspan="c.columns.length || 1">
                        <div class="flex items-center justify-center gap-2 p-4 text-[var(--dp-color-text-secondary)]">
                            <DpSpin :comp="{ size: 16 }" />
                            <slot name="loading">加载中…</slot>
                        </div>
                    </td>
                </tr>
                <tr v-else-if="c.data.length === 0">
                    <td :colspan="c.columns.length || 1">
                        <slot name="empty">
                            <div class="p-6 text-center text-[var(--dp-color-text-secondary)]">
                                {{ c.emptyText }}
                            </div>
                        </slot>
                    </td>
                </tr>
                <tr v-for="(row, rowIndex) in c.data" v-else :key="rowKeyOf(row, rowIndex)"
                    class="border-t border-[var(--dp-color-border)]" :class="[
                        c.striped && rowIndex % 2 === 1
                            ? 'bg-[color-mix(in_srgb,var(--dp-color-border)_20%,transparent)]'
                            : 'bg-[var(--dp-color-surface)]',
                    ]">
                    <td v-for="col in c.columns" :key="col.key" class="px-3 py-2" :class="[
                        cellPad,
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                    ]">
                        <slot :name="`td-${col.key}`" :row="row" :column="col" :index="rowIndex">
                            {{ cellValue(row, col.key) }}
                        </slot>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
