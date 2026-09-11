<script setup lang="ts">
import { usePage } from '@dp_ui/core'

// 在 DpPage 内部调用，读取页面级上下文（由 DpPage provide 注入）
const page = usePage()
</script>

<template>
  <p style="font-size: 13px; color: var(--dp-color-text-secondary, #6b7280)">
    usePage() → title: {{ page?.title ?? '-' }}
  </p>
</template>
