<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpBreadcrumb', inheritAttrs: false })

export interface DpBreadcrumbItem {
    label: string
    href?: string
}

export interface DpBreadcrumbComp {
    items: DpBreadcrumbItem[]
}

export type DpBreadcrumbProps = DpProps<DpBreadcrumbComp>

const props = defineProps<DpBreadcrumbProps>()

const { comp: c, rootAttrs } = useDpProps<DpBreadcrumbComp>(props, {
    compDefaults: { items: [] },
})
</script>

<template>
    <nav v-bind="rootAttrs" class="dp-breadcrumb flex items-center gap-2 text-sm text-[var(--dp-color-text-secondary)]">
        <template v-for="(item, index) in c.items" :key="`${item.label}-${index}`">
            <span v-if="index > 0" class="dp-breadcrumb__separator text-[var(--dp-color-border)]">/</span>
            <a v-if="item.href" :href="item.href" class="transition-colors hover:text-[var(--dp-color-primary)]">
                {{ item.label }}
            </a>
            <span v-else class="text-[var(--dp-color-text)]">{{ item.label }}</span>
        </template>
    </nav>
</template>
