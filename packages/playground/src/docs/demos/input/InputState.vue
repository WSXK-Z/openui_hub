<script setup lang="ts">
import { ref } from 'vue'

const password = ref('')
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpInput v-model="password" :comp="{ label: '密码', type: 'password', placeholder: '请输入密码' }" />
        <DpInput :comp="{ label: '禁用', disabled: true, placeholder: '禁用状态' }" />
        <DpInput :comp="{ label: '只读', readonly: true, placeholder: '只读状态' }" />
    </div>
</template>
