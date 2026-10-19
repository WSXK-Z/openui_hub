<script setup lang="ts">
const sides = ['top', 'right', 'bottom', 'left'] as const
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpTooltip v-for="side in sides" :key="side" :comp="{ content: `出现在 ${side}`, side }">
            <DpButton :theme="{ size: 'small' }">{{ side }}</DpButton>
        </DpTooltip>
        <DpTooltip :comp="{ content: '延迟 500ms 出现', delayDuration: 500 }">
            <DpButton :theme="{ size: 'small', ghost: true }">延迟提示</DpButton>
        </DpTooltip>
    </div>
</template>
