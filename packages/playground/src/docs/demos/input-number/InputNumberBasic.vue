<script setup lang="ts">
import { ref } from 'vue'

const value = ref(5)
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpInputNumber v-model="value" :comp="{ min: 0, max: 100, step: 5 }" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">当前值：{{ value }}</span>
    </div>
</template>
