<script setup lang="ts">
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'

defineOptions({ name: 'DpLayoutSider', inheritAttrs: false })

export interface DpLayoutSiderComp {}

export type DpLayoutSiderProps = DpProps<DpLayoutSiderComp>

const props = defineProps<DpLayoutSiderProps>()

const { rootAttrs } = useDpProps<DpLayoutSiderComp>(props)
</script>

<template>
    <div v-bind="rootAttrs" class="dp-layout dp-layout--sider flex min-h-screen">
        <aside v-if="$slots.sider"
            class="dp-layout__sider w-60 shrink-0 border-r border-[var(--dp-color-border)] bg-[var(--dp-color-surface)]">
            <slot name="sider" />
        </aside>
        <div class="dp-layout__body flex min-w-0 flex-1 flex-col">
            <header v-if="$slots.header"
                class="dp-layout__header sticky top-0 z-[100] border-b border-[var(--dp-color-border)] bg-[var(--dp-color-surface)]">
                <slot name="header" />
            </header>
            <main class="dp-layout__main flex-1 p-4">
                <slot />
            </main>
        </div>
    </div>
</template>
