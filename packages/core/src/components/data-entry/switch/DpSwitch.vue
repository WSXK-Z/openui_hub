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
            class="dp-switch inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none data-[state=checked]:bg-[var(--dp-color-primary)] data-[state=unchecked]:bg-[color-mix(in_srgb,var(--dp-color-border)_70%,transparent)] disabled:cursor-not-allowed disabled:opacity-55">
            <SwitchThumb
                class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
        </SwitchRoot>
        <span v-if="c.label" class="text-sm">{{ c.label }}</span>
    </label>
</template>
