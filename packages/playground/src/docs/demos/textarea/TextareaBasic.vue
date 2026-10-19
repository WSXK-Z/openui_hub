<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
</script>

<template>
    <div class="flex flex-col gap-3">
        <DpTextarea v-model="value" :comp="{ label: '备注', rows: 4, placeholder: '请输入备注内容' }" />
        <DpTextarea :comp="{ label: '不可缩放', rows: 3, resize: false, placeholder: 'resize: false' }" />
    </div>
</template>
