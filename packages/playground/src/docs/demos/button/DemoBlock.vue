<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
</script>

<template>
    <div class="flex w-full flex-col gap-3">
        <DpButton :theme="{ variant: 'primary', block: true }">块级按钮（block）</DpButton>
        <DpButton :theme="{ variant: 'default', block: true }">块级幽灵</DpButton>
    </div>
</template>
