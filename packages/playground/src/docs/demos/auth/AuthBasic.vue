<script setup lang="ts">
import { setAuthCodes, DpAuth } from '@dp_ui/core'

// 模块级权限码表：无 DpProvide/注入上下文时作为回退
setAuthCodes(['dashboard:view'])
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpAuth :comp="{ code: 'dashboard:view' }">
            <DpTag :theme="{ variant: 'success' }">有 dashboard:view 权限</DpTag>
        </DpAuth>
        <DpAuth :comp="{ code: 'user:edit' }">
            <DpTag :theme="{ variant: 'success' }">不应显示</DpTag>
            <template #fallback>
                <DpTag :theme="{ variant: 'danger' }">无 user:edit 权限，展示 fallback</DpTag>
            </template>
        </DpAuth>
        <DpButton v-auth="'dashboard:view'" :theme="{ size: 'small' }">v-auth 指令</DpButton>
    </div>
</template>
