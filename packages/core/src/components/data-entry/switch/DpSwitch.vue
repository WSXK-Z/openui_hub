<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'
import { SwitchRoot, SwitchThumb } from 'reka-ui'

defineOptions({ name: 'DpSwitch', inheritAttrs: false })

export interface DpSwitchComp {
    disabled: boolean
    label: string
}

export type DpSwitchProps = DpProps<DpSwitchComp>

const props = defineProps<DpSwitchProps>()

const { comp: c, rootAttrs } = useDpProps<DpSwitchComp>(props, {
    compDefaults: { disabled: false, label: '' },
})

const checked = defineModel<boolean>({ default: false })
</script>

<template>
    <label v-bind="rootAttrs" class="dp-switch-wrapper inline-flex cursor-pointer items-center gap-2">
        <SwitchRoot :model-value="checked" :disabled="c.disabled"
            @update:model-value="(v: unknown) => (checked = v === true)"
            class="dp-switch inline-flex h-[22px] w-10 shrink-0 items-center rounded-full border border-[var(--dp-color-border-strong)] bg-[var(--dp-color-surface-3)] p-[2px] transition-[background-color,border-color,box-shadow] duration-[200ms] outline-none data-[state=checked]:border-[var(--dp-color-accent)] data-[state=checked]:bg-[var(--dp-color-accent)] focus-visible:shadow-[var(--dp-ring)] disabled:cursor-not-allowed disabled:opacity-50">
            <SwitchThumb
                class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--dp-color-surface)] shadow-[var(--dp-shadow-1)] transition-transform duration-[200ms] ease-[var(--dp-ease-enter)] data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0" />
        </SwitchRoot>
        <span v-if="c.label" class="text-sm text-[var(--dp-color-fg-2)]">{{ c.label }}</span>
    </label>
</template>
