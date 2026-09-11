<script setup lang="ts">
import { DpButton } from '@dp_ui/core'
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <!-- icon + round：纯图标圆形按钮 -->
        <DpButton :theme="{ variant: 'primary', round: true, icon: true }" aria-label="确定">✓</DpButton>
        <DpButton :theme="{ variant: 'danger', round: true, icon: true }" aria-label="删除">✕</DpButton>
        <DpButton :theme="{ variant: 'default', round: true, icon: true, ghost: true }" aria-label="刷新">↻</DpButton>
        <!-- icon：方形图标按钮 -->
        <DpButton :theme="{ variant: 'default', icon: true }" aria-label="更多">＋</DpButton>
        <!-- round：普通文字按钮变圆角 -->
        <DpButton :theme="{ variant: 'primary', round: true }">圆角按钮</DpButton>
    </div>
</template>
