<script setup lang="ts">
import { ref } from 'vue'

const checked = ref(true)
</script>

<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <DpTag :comp="{ checkable: true }" :theme="{ variant: 'primary' }" v-model:checked="checked">
                可选标签（{{ checked ? '已选中' : '未选中' }}）
            </DpTag>
            <DpTag :comp="{ checkable: true, disabled: true }">禁用可选</DpTag>
            <DpTag :comp="{ disabled: true }" :theme="{ variant: 'danger' }">禁用</DpTag>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <DpTag :theme="{ bordered: false, variant: 'success' }">无边框</DpTag>
            <DpTag :theme="{ bordered: false, variant: 'warning' }">无边框警告</DpTag>
        </div>
    </div>
</template>
