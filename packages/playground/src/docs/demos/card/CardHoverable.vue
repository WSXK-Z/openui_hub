<script setup lang="ts">
const paddings = ['none', 'small', 'default', 'large'] as const
</script>

<template>
    <div class="flex flex-wrap items-stretch gap-3">
        <DpCard v-for="padding in paddings" :key="padding"
            :comp="{ title: `padding: ${padding}`, padding, hoverable: true }" style="width: 180px">
            <span class="text-sm text-[var(--dp-color-fg-2)]">内边距 {{ padding }}</span>
        </DpCard>
    </div>
</template>
