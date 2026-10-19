<script setup lang="ts">
import { ref } from 'vue'

const tags = ref(['Vue', 'TypeScript', 'UnoCSS'])
</script>

<template>
    <div class="flex flex-wrap items-center gap-2">
        <DpTag v-for="tag in tags" :key="tag" :comp="{ closable: true }" :theme="{ variant: 'primary', round: true }"
            @close="tags = tags.filter((item) => item !== tag)">
            {{ tag }}
        </DpTag>
        <DpTag :theme="{ size: 'small' }">small</DpTag>
        <DpTag :theme="{ size: 'large', variant: 'warning' }">large</DpTag>
    </div>
</template>
