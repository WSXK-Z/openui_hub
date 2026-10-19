<script setup lang="ts">
const steps = [
    { title: '填写信息', description: '录入基础信息' },
    { title: '提交审核', description: '等待审核结果' },
    { title: '完成', description: '流程结束' },
]
</script>

<template>
    <div class="flex flex-col gap-6">
        <DpSteps :comp="{ steps, current: 1, vertical: true }" />
        <DpSteps :comp="{ steps, current: 1, status: 'error' }" />
        <DpSteps :comp="{ steps, current: 0, status: 'finish' }" />
    </div>
</template>
