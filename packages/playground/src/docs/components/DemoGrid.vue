<script setup lang="ts">
defineProps<{
    /** 单列展示（示例较宽时使用） */
    single?: boolean
}>()
</script>

<template>
    <div class="pg-demo-grid" :class="{ 'pg-demo-grid--single': single }">
        <slot />
    </div>
</template>

<style scoped>
/* 两列瀑布流：与 Naive UI 组件演示一致，窄屏自动回落为单列 */
.pg-demo-grid {
    columns: 2;
    column-gap: 16px;
}

.pg-demo-grid > :deep(*) {
    break-inside: avoid;
    margin-bottom: 16px;
}

.pg-demo-grid--single {
    columns: 1;
}

@media (max-width: 1100px) {
    .pg-demo-grid {
        columns: 1;
    }
}
</style>
