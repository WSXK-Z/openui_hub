<script setup lang="ts">
import { ref } from 'vue'
import { DpButton } from '@dp_ui/core'

const loading = ref(false)
function simulate() {
    if (loading.value) return
    loading.value = true
    window.setTimeout(() => {
        loading.value = false
    }, 1500)
}
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpButton :theme="{ variant: 'primary' }" :comp="{ disabled: true }">禁用</DpButton>
        <DpButton :comp="{ disabled: true }">禁用默认</DpButton>
        <DpButton :theme="{ variant: 'primary' }" :comp="{ loading }" @click="simulate">
            {{ loading ? '加载中…' : '点击加载' }}
        </DpButton>
    </div>
</template>
