<script setup lang="ts">
import { ref } from 'vue'
import { DpButton } from '@dp_ui/core'

const count = ref(0)
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpButton :theme="{ variant: 'primary' }" @click="count += 1">点我触发 click</DpButton>
        <DpButton :comp="{ nativeType: 'submit' }">原生 type=submit</DpButton>
        <span class="text-sm text-[var(--dp-color-text-secondary,#6b7280)]">已点击 {{ count }} 次</span>
    </div>
</template>
