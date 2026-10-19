<script setup lang="ts">
const types = ['default', 'primary', 'success', 'warning', 'danger', 'info'] as const
</script>

<template>
    <div class="flex flex-wrap items-center gap-2">
        <DpTag v-for="type in types" :key="type" :theme="{ variant: type }">{{ type }}</DpTag>
    </div>
</template>
