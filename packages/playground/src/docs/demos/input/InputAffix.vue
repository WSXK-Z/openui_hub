<script setup lang="ts">
import { ref } from 'vue'

const value = ref('128')
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpInput v-model="value" :comp="{ label: '金额', maxlength: 12, showCount: true }">
            <template #prefix>￥</template>
            <template #suffix>元</template>
        </DpInput>
        <DpInput :comp="{ placeholder: '搜索组件', clearable: true }">
            <template #prefix>🔍</template>
        </DpInput>
    </div>
</template>
