<script setup lang="ts">
import { ref } from 'vue'

const tags = ref(['vue', 'typescript'])
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpTagsInput v-model="tags" :comp="{ placeholder: '回车添加标签' }" style="max-width: 360px" />
        <span class="text-sm text-[var(--dp-color-fg-2)]">标签：{{ tags.join('、') || '（空）' }}</span>
    </div>
</template>
