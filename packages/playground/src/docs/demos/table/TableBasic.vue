<script setup lang="ts">
const columns = [
    { key: 'name', title: '姓名' },
    { key: 'role', title: '角色' },
    { key: 'age', title: '年龄', align: 'right' as const },
]
const data = [
    { name: '张三', role: '管理员', age: 28 },
    { name: '李四', role: '编辑', age: 24 },
    { name: '王五', role: '访客', age: 31 },
]
</script>

<template>
    <DpTable :comp="{ columns, data, striped: true }" :theme="{ bordered: true }">
        <template #td-role="{ row }">
            <DpTag :theme="{ variant: row.role === '管理员' ? 'primary' : 'default' }">{{ row.role }}</DpTag>
        </template>
    </DpTable>
</template>
