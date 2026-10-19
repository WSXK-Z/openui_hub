<script setup lang="ts">
import { ref } from 'vue'

const value = ref(68)
</script>

<template>
    <div class="flex flex-col gap-5">
        <DpProgress v-model="value" :theme="{ status: 'success', showIndicator: true }" />
        <div class="flex flex-wrap items-center gap-6">
            <DpProgress v-model="value" :theme="{ type: 'circle', size: 'small', showIndicator: true }" />
            <DpProgress v-model="value"
                :theme="{ type: 'circle', size: 'medium', status: 'warning', showIndicator: true }" />
            <DpProgress :model-value="100"
                :theme="{ type: 'circle', size: 'large', status: 'danger', showIndicator: true }" />
        </div>
    </div>
</template>
