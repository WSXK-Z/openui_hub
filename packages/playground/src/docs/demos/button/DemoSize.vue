<script setup lang="ts">
import { DpButton } from '@dp_ui/core'

const sizes = ['small', 'medium', 'large'] as const
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpButton v-for="s in sizes" :key="s" :theme="{ variant: 'primary', size: s }">
            {{ s }}
        </DpButton>
    </div>
</template>
