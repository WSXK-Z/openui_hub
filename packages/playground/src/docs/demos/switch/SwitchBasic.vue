<script setup lang="ts">
import { ref } from 'vue'

const enabled = ref(true)
const disabled = ref(false)
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpSwitch v-model="enabled" :comp="{ label: '开启通知' }" />
        <DpSwitch v-model="disabled" :comp="{ label: '禁用状态', disabled: true }" />
        <DpSwitch v-model="enabled" :theme="{ size: 'small' }" :comp="{ label: '小尺寸' }" />
    </div>
</template>
