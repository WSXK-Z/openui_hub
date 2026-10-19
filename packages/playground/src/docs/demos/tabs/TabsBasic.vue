<script setup lang="ts">
import { ref } from 'vue'

const tabs = [
    { label: '概览', value: 'overview', content: '概览面板的内容。' },
    { label: '配置', value: 'config', content: '配置面板的内容。' },
    { label: '日志', value: 'logs', content: '日志面板的内容。' },
]
const active = ref('overview')
</script>

<template>
    <DpTabs v-model="active" :comp="{ items: tabs }" />
</template>
