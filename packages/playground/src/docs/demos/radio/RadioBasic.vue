<script setup lang="ts">
import { ref } from 'vue'

const options = [
    { label: '选项 A', value: 'a' },
    { label: '选项 B', value: 'b' },
    { label: '选项 C', value: 'c' },
]
const value = ref('a')
</script>

<template>
    <div class="flex flex-col gap-4">
        <DpRadio v-model="value" :comp="{ options }" />
        <DpRadio v-model="value" :comp="{ options, vertical: true }" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">当前值：{{ value }}</span>
    </div>
</template>
