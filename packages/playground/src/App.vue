<script setup lang="ts">
import { RouterView } from 'vue-router'
import SiteHeader from './docs/SiteHeader.vue'
</script>

<template>
    <div class="pg-app min-h-screen bg-[var(--dp-color-bg,#fafafb)] text-[var(--dp-color-fg,#1b1e26)]">
        <SiteHeader />
        <RouterView />
    </div>
</template>
