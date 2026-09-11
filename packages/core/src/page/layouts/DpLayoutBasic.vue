<script setup lang="ts">
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'

defineOptions({ name: 'DpLayoutBasic', inheritAttrs: false })

export interface DpLayoutBasicComp {}

export type DpLayoutBasicProps = DpProps<DpLayoutBasicComp>

const props = defineProps<DpLayoutBasicProps>()

const { rootAttrs } = useDpProps<DpLayoutBasicComp>(props)
</script>

<template>
    <div v-bind="rootAttrs" class="dp-layout dp-layout--basic flex min-h-screen flex-col">
        <header v-if="$slots.header"
            class="dp-layout__header sticky top-0 z-[100] border-b border-[var(--dp-color-border)] bg-[var(--dp-color-surface)]">
            <slot name="header" />
        </header>
        <main class="dp-layout__main flex-1 p-4">
            <slot />
        </main>
        <footer v-if="$slots.footer"
            class="dp-layout__footer border-t border-[var(--dp-color-border)] bg-[var(--dp-color-surface)]">
            <slot name="footer" />
        </footer>
    </div>
</template>
