<script setup lang="ts">
import { ref } from 'vue'

const steps = [
    { title: '填写信息', description: '录入基础信息' },
    { title: '提交审核', description: '等待审核结果' },
    { title: '完成', description: '流程结束' },
]
const current = ref(1)
</script>

<template>
    <div class="flex flex-col gap-4">
        <DpSteps :comp="{ steps, current }" />
        <DpSpace>
            <DpButton :theme="{ size: 'small' }" :comp="{ disabled: current === 0 }"
                @click="current = Math.max(0, current - 1)">上一步</DpButton>
            <DpButton :theme="{ size: 'small', variant: 'primary' }"
                :comp="{ disabled: current === steps.length - 1 }"
                @click="current = Math.min(steps.length - 1, current + 1)">下一步</DpButton>
        </DpSpace>
    </div>
</template>
