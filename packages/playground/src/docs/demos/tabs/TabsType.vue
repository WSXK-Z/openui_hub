<script setup lang="ts">
import { ref } from 'vue'

const items = [
    { label: '概览', value: 'overview', content: '概览面板内容。' },
    { label: '配置', value: 'config', content: '配置面板内容。' },
]
const line = ref('overview')
const card = ref('overview')
</script>

<template>
    <div class="flex flex-col gap-5">
        <div>
            <div class="mb-2 text-xs text-[var(--dp-color-fg-2)]">线条型（line）</div>
            <DpTabs v-model="line" :comp="{ items }" :theme="{ type: 'line' }" />
        </div>
        <div>
            <div class="mb-2 text-xs text-[var(--dp-color-fg-2)]">卡片型（card）</div>
            <DpTabs v-model="card" :comp="{ items }" :theme="{ type: 'card' }" />
        </div>
    </div>
</template>
