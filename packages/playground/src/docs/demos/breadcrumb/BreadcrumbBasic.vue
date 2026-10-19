<script setup lang="ts">
const items = [
    { label: '首页', href: '/' },
    { label: '组件文档', href: '/docs/button' },
    { label: 'Breadcrumb', href: '/docs/breadcrumb' },
    { label: '当前页' },
]
</script>

<template>
    <DpBreadcrumb :comp="{ items, separator: '›' }" />
</template>
