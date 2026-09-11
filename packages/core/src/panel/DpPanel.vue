<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps } from '../types'
import { providePanelContext } from './panelContext'

defineOptions({ name: 'DpPanel', inheritAttrs: false })

export interface DpPanelComp {
    title: string
    collapsible: boolean
    defaultCollapsed: boolean
    size: 'small' | 'default' | 'wide'
    loading: boolean
}

export type DpPanelProps = DpProps<DpPanelComp>

let panelSeq = 0

const props = defineProps<DpPanelProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpPanelComp>(props, {
    compDefaults: { title: '', collapsible: false, defaultCollapsed: false, size: 'default', loading: false },
    themeDefaults: { bordered: true },
})

const collapsed = ref(c.value.defaultCollapsed)

panelSeq += 1
const id = `dp-panel-${panelSeq}`
providePanelContext({ id, title: c.value.title })

const classes = computed(() => [
    'dp-panel',
    'flex flex-col bg-[var(--dp-color-surface)]',
    `dp-panel--${c.value.size}`,
    s.value.bordered &&
    'dp-panel--bordered border border-[var(--dp-color-border)] rounded-[var(--dp-radius-md)]',
    collapsed.value && 'dp-panel--collapsed',
])

const bodySizeClass = computed(() =>
    c.value.size === 'small' ? 'p-3' : c.value.size === 'wide' ? 'p-6' : 'p-4',
)

function toggle() {
    collapsed.value = !collapsed.value
}
</script>

<template>
    <section v-bind="rootAttrs" :class="classes">
        <header v-if="c.title || c.collapsible || $slots.header"
            class="dp-panel__header flex items-center justify-between px-4 py-3 font-semibold"
            :class="{ 'border-b border-[var(--dp-color-border)]': !collapsed }">
            <slot name="header">
                <span class="dp-panel__title text-sm">{{ c.title }}</span>
            </slot>
            <button v-if="c.collapsible"
                class="dp-panel__toggle inline-flex h-6 w-6 items-center justify-center rounded-[var(--dp-radius-sm)] text-[var(--dp-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--dp-color-border)_40%,transparent)]"
                type="button" :aria-expanded="!collapsed" @click="toggle">
                <span class="dp-panel__toggle-icon inline-block transition-transform duration-200"
                    :class="{ '-rotate-90': collapsed }" aria-hidden="true">
                    ▾
                </span>
            </button>
        </header>
        <div v-show="!collapsed" class="dp-panel__body relative" :class="bodySizeClass">
            <slot />
            <div v-if="c.loading"
                class="dp-panel__loading absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--dp-color-surface)_70%,transparent)] text-[13px] text-[var(--dp-color-text-secondary)]"
                role="status">
                Loading…
            </div>
        </div>
    </section>
</template>
