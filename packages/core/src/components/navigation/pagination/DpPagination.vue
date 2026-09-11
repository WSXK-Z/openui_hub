<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpPagination', inheritAttrs: false })

export interface DpPaginationComp {
    total: number
    pageSize: number
}

export type DpPaginationProps = DpProps<DpPaginationComp>

const props = defineProps<DpPaginationProps>()

const { comp: c, rootAttrs } = useDpProps<DpPaginationComp>(props, {
    compDefaults: { total: 0, pageSize: 10 },
})

const current = defineModel<number>('current', { default: 1 })

// TODO(reka-ui): 若要让分页状态/键盘交互走无头原语，可用 reka Pagination
// （PaginationRoot :total/:items-per-page + v-model:page，PaginationList/ListItem/Prev/Next/Ellipsis）
// 在保持 DpPaginationComp 契约与现有页码 UI 的前提下替换内部实现。
const pageCount = computed(() => Math.max(1, Math.ceil(c.value.total / c.value.pageSize)))

const pages = computed(() => Array.from({ length: pageCount.value }, (_, i) => i + 1))

const btnClass =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--dp-radius-sm)] px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40'

function go(page: number) {
    const next = Math.min(Math.max(page, 1), pageCount.value)
    if (next !== current.value) current.value = next
}
</script>

<template>
    <nav v-bind="rootAttrs" class="dp-pagination inline-flex items-center gap-1">
        <button :class="btnClass" :disabled="current <= 1" type="button" aria-label="上一页" @click="go(current - 1)">
            ‹
        </button>
        <button v-for="page in pages" :key="page" :class="[
            btnClass,
            page === current
                ? 'bg-[var(--dp-color-primary)] text-white'
                : 'text-[var(--dp-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--dp-color-border)_40%,transparent)]',
        ]" type="button" :aria-current="page === current ? 'page' : undefined" @click="go(page)">
            {{ page }}
        </button>
        <button :class="btnClass" :disabled="current >= pageCount" type="button" aria-label="下一页"
            @click="go(current + 1)">
            ›
        </button>
    </nav>
</template>
