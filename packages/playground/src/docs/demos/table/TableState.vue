<script setup lang="ts">
const columns = [
    { key: 'name', title: '名称' },
    { key: 'status', title: '状态' },
]
const data = [
    { name: '任务一', status: '进行中' },
    { name: '任务二', status: '已完成' },
]
</script>

<template>
    <div class="flex flex-col gap-4">
        <DpTable :comp="{ columns, data: [], emptyText: '暂无数据' }" />
        <DpTable :comp="{ columns, data, loading: true }" />
    </div>
</template>
