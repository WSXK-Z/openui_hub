<script setup lang="ts">
import { ref } from 'vue'

const checked = ref(true)
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpCheckbox v-model="checked" :comp="{ label: '同意用户协议' }" />
        <DpCheckbox v-model="checked" :comp="{ label: '禁用状态', disabled: true }" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">当前：{{ checked ? '已勾选' : '未勾选' }}</span>
    </div>
</template>
