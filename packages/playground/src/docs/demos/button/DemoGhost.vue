<script setup lang="ts">
import { DpButton } from '@dp_ui/core'

const variants = ['default', 'primary', 'success', 'warning', 'danger', 'info'] as const
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpButton v-for="v in variants" :key="v" :theme="{ variant: v, ghost: true }">Ghost {{ v }}</DpButton>
    </div>
</template>
