<script setup lang="ts">
import { ref } from 'vue'

const page = ref(50)
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpPagination v-model:current="page" :comp="{ total: 1000, pageSize: 10, maxVisible: 7 }" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">共 100 页，当前第 {{ page }} 页</span>
    </div>
</template>
