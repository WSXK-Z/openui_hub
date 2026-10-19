<script setup lang="ts">
import { ref } from 'vue'

const progress = ref(60)
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpProgress v-model="progress" />
        <DpSpace>
            <DpButton :theme="{ size: 'small' }" @click="progress = Math.max(0, progress - 10)">-10</DpButton>
            <DpButton :theme="{ size: 'small' }" @click="progress = Math.min(100, progress + 10)">+10</DpButton>
            <span class="text-sm text-[var(--dp-color-fg-2)]">{{ progress }}%</span>
        </DpSpace>
    </div>
</template>
