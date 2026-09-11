<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpButton>默认按钮</DpButton>
        <DpButton :theme="{ variant: 'primary' }">主要按钮</DpButton>
        <DpButton :theme="{ variant: 'default', bordered: true }">带边框</DpButton>
    </div>
</template>
