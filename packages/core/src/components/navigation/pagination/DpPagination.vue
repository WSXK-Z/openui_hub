<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpPagination', inheritAttrs: false })

export interface DpPaginationComp {
    total: number
    pageSize: number
    /** 最多展示的页码按钮数（含首尾与省略号），默认 7 */
    maxVisible: number
}

export type DpPaginationProps = DpProps<DpPaginationComp>

const props = defineProps<DpPaginationProps>()

const { comp: c, rootAttrs } = useDpProps<DpPaginationComp>(props, {
    compDefaults: { total: 0, pageSize: 10, maxVisible: 7 },
})

const current = defineModel<number>('current', { default: 1 })

type PageItem = number | 'start-ellipsis' | 'end-ellipsis'

const pageCount = computed(() => Math.max(1, Math.ceil(c.value.total / c.value.pageSize)))

const pageItems = computed<PageItem[]>(() => {
    const count = pageCount.value
    const max = Math.max(5, c.value.maxVisible)
    if (count <= max) {
        return Array.from({ length: count }, (_, i) => i + 1)
    }

    const windowSize = max - 2
    let start = current.value - Math.floor((windowSize - 1) / 2)
    let end = start + windowSize - 1
    if (start < 2) {
        start = 2
        end = start + windowSize - 1
    }
    if (end > count - 1) {
        end = count - 1
        start = end - windowSize + 1
    }
    start = Math.max(2, start)

    let showStart = start > 2
    let showEnd = end < count - 1
    let reserved = 2 + Number(showStart) + Number(showEnd)
    while (end > start && end - start + 1 > max - reserved) {
        if (current.value - start > end - current.value) start += 1
        else end -= 1
        showStart = start > 2
        showEnd = end < count - 1
        reserved = 2 + Number(showStart) + Number(showEnd)
    }

    const items: PageItem[] = [1]
    if (showStart) items.push('start-ellipsis')
    for (let page = start; page <= end; page += 1) items.push(page)
    if (showEnd) items.push('end-ellipsis')
    items.push(count)
    return items
})

const btnClass =
    'dp-mono inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-[var(--dp-radius-sm)] px-2 text-xs transition-[background-color,color] duration-[140ms] focus-visible:shadow-[var(--dp-ring)] disabled:cursor-not-allowed disabled:opacity-40'

function go(page: number) {
    const next = Math.min(Math.max(page, 1), pageCount.value)
    if (next !== current.value) current.value = next
}

function goEllipsis(item: PageItem) {
    const step = Math.max(1, c.value.maxVisible - 2)
    go(item === 'start-ellipsis' ? current.value - step : current.value + step)
}
</script>

<template>
    <nav v-bind="rootAttrs" class="dp-pagination inline-flex items-center gap-1">
        <button :class="[btnClass, 'bg-transparent']" :disabled="current <= 1" type="button" aria-label="上一页"
            @click="go(current - 1)">
            ‹
        </button>
        <template v-for="(item, index) in pageItems" :key="`${item}-${index}`">
            <button v-if="typeof item === 'number'" :class="[
                btnClass,
                item === current
                    ? 'bg-[var(--dp-color-accent)] text-[var(--dp-color-accent-fg)]'
                    : 'bg-transparent text-[var(--dp-color-fg-2)] hover:bg-[var(--dp-color-surface-2)]',
            ]" type="button" :aria-current="item === current ? 'page' : undefined" @click="go(item)">
                {{ item }}
            </button>
            <button v-else :class="[btnClass, 'cursor-pointer bg-transparent text-[var(--dp-color-muted)]']"
                type="button" :aria-label="item === 'start-ellipsis' ? '向前翻页' : '向后翻页'" @click="goEllipsis(item)">
                …
            </button>
        </template>
        <button :class="[btnClass, 'bg-transparent']" :disabled="current >= pageCount" type="button"
            aria-label="下一页" @click="go(current + 1)">
            ›
        </button>
    </nav>
</template>
