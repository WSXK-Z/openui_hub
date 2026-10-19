<script setup lang="ts">
import { ref } from 'vue'

const options = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' },
    { label: '售罄（禁用）', value: 'sold-out', disabled: true },
]
const value = ref('apple')
</script>

<template>
    <div class="flex flex-col gap-3">
        <div style="max-width: 260px">
            <DpSelect v-model="value" :comp="{ options, placeholder: '请选择水果', clearable: true }" />
        </div>
        <span class="text-sm text-[var(--dp-color-fg-2)]">当前值：{{ value }}</span>
    </div>
</template>
