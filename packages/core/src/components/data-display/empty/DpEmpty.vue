<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpEmpty', inheritAttrs: false })

export interface DpEmptyComp {
    description: string
}

export type DpEmptyProps = DpProps<DpEmptyComp>

const props = defineProps<DpEmptyProps>()

const { comp: c, rootAttrs } = useDpProps<DpEmptyComp>(props, {
    compDefaults: { description: '暂无数据' },
})
</script>

<template>
    <div v-bind="rootAttrs" class="dp-empty flex flex-col items-center justify-center gap-2 p-6 text-[var(--dp-color-muted)]">
        <div class="dp-empty__icon text-4xl leading-none opacity-40">
            <slot name="icon">◻</slot>
        </div>
        <p class="dp-empty__description text-[13px]">{{ c.description }}</p>
        <slot />
    </div>
</template>
