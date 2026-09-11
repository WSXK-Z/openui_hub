<script setup lang="ts">
import { Toggle } from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpToggle', inheritAttrs: false })

export interface DpToggleComp {
    disabled: boolean
}

export type DpToggleProps = DpProps<DpToggleComp>

const props = defineProps<DpToggleProps>()

const { comp: c, rootAttrs } = useDpProps<DpToggleComp>(props, {
    compDefaults: { disabled: false },
})

const pressed = defineModel<boolean>({ default: false })
</script>

<template>
    <!-- 基于 reka-ui Toggle：两态按钮（v-model pressed） -->
    <Toggle v-bind="rootAttrs" v-model="pressed" :disabled="c.disabled"
        class="dp-toggle inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--dp-radius-sm)] border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55"
        :class="pressed
            ? 'border-transparent bg-[var(--dp-color-primary)] text-white'
            : 'border-[var(--dp-color-border)] bg-[var(--dp-color-surface)] text-[var(--dp-color-text-secondary)] hover:text-[var(--dp-color-primary)]'">
        <slot />
    </Toggle>
</template>
