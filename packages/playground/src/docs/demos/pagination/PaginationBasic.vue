<script setup lang="ts">
import { ref } from 'vue'

const page = ref(1)
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpPagination v-model:current="page" :comp="{ total: 128, pageSize: 10 }" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">当前第 {{ page }} 页</span>
    </div>
</template>
