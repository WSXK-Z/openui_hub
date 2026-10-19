<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpInput v-model="value" :comp="{ label: '用户名', placeholder: '请输入用户名', clearable: true }" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">输入值：{{ value || '（空）' }}</span>
    </div>
</template>
