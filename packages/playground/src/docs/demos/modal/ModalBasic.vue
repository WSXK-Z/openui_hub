<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>

<template>
    <div>
        <DpButton :theme="{ variant: 'primary' }" @click="open = true">打开模态框</DpButton>
        <DpModal v-model:open="open" :comp="{ title: '确认操作', width: 420 }">
            <p class="m-0 text-sm leading-6 text-[var(--dp-color-fg-2)]">是否确认执行该操作？</p>
            <template #footer>
                <DpButton @click="open = false">取消</DpButton>
                <DpButton :theme="{ variant: 'primary' }" @click="open = false">确定</DpButton>
            </template>
        </DpModal>
    </div>
</template>
