<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 文案（未提供默认插槽时显示） */
    label?: string
  }>(),
  { label: '' },
)
</script>

<template>
  <div class="inline-flex items-center">
    <slot>{{ label }}</slot>
  </div>
</template>
