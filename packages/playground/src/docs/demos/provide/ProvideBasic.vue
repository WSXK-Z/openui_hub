<script setup lang="ts">
import { defineComponent, h, inject } from 'vue'

const Consumer = defineComponent({
    name: 'ProvideConsumer',
    setup() {
        const themeName = inject<string>('demo:theme-name', '未注入')
        return () =>
            h(
                'span',
                { class: 'rounded-[var(--dp-radius-sm)] bg-[var(--dp-color-accent-soft)] px-2 py-1 text-sm text-[var(--dp-color-accent)]' },
                `注入值：${themeName}`,
            )
    },
})
</script>

<template>
    <DpProvide :comp="{ key: 'demo:theme-name', value: 'cool-neutral' }">
        <Consumer />
    </DpProvide>
</template>
