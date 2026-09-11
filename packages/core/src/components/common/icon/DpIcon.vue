<script setup lang="ts">
import { computed } from 'vue'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpIcon', inheritAttrs: false })

export interface DpIconComp {
    /** UnoCSS 图标类，如 `i-carbon-add`（需使用方启用 presetIcons） */
    icon: string
    /** 字号（数值按 px、字符串原样），默认 1em */
    size: number | string
}

export type DpIconProps = DpProps<DpIconComp>

const props = defineProps<DpIconProps>()

const { comp: c, rootAttrs } = useDpProps<DpIconComp>(props, {
    compDefaults: { icon: '', size: '1em' },
})

const iconStyle = computed(() => ({
    fontSize: typeof c.value.size === 'number' ? `${c.value.size}px` : c.value.size,
}))
</script>

<template>
    <span v-bind="rootAttrs" class="dp-icon inline-block h-[1em] w-[1em] leading-none align-[-0.125em]"
        :class="c.icon" :style="iconStyle" aria-hidden="true" />
</template>
