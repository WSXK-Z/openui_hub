<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpDivider', inheritAttrs: false })

export interface DpDividerComp {
    vertical: boolean
    orientation: 'left' | 'center' | 'right'
    dashed: boolean
}

export type DpDividerProps = DpProps<DpDividerComp>

const props = defineProps<DpDividerProps>()

const { comp: c, rootAttrs } = useDpProps<DpDividerComp>(props, {
    compDefaults: { vertical: false, orientation: 'center', dashed: false },
})

const lineClass = computed(() =>
    c.value.dashed
        ? 'border-t border-dashed border-[var(--dp-color-border)]'
        : 'bg-[var(--dp-color-border)]',
)

const classes = computed(() => [
    'dp-divider',
    c.value.vertical
        ? 'dp-divider--vertical inline-flex items-center'
        : 'flex items-center gap-3 whitespace-nowrap text-sm text-[var(--dp-color-text-secondary)]',
])

const startLineClass = computed(() => [
    'dp-divider__line dp-divider__line--start h-px flex-1',
    lineClass.value,
    c.value.orientation === 'left' ? 'w-6 flex-grow-0' : '',
])

const endLineClass = computed(() => [
    'dp-divider__line dp-divider__line--end h-px flex-1',
    lineClass.value,
    c.value.orientation === 'right' ? 'w-6 flex-grow-0' : '',
])
</script>

<template>
    <div v-bind="rootAttrs" :class="classes" role="separator">
        <template v-if="c.vertical">
            <span class="dp-divider__line h-[1em] w-px bg-[var(--dp-color-border)]" />
        </template>
        <template v-else-if="$slots.default">
            <span :class="startLineClass" />
            <span class="dp-divider__text px-3">
                <slot />
            </span>
            <span :class="endLineClass" />
        </template>
        <span v-else class="dp-divider__line h-px flex-1" :class="lineClass" />
    </div>
</template>
