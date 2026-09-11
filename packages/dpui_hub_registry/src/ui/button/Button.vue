<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', disabled: false },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    class="dpui-btn"
    :class="[`dpui-btn-${variant}`, `dpui-btn-${size}`]"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.dpui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.dpui-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dpui-btn-primary {
  background: #2563eb;
  color: #fff;
}
.dpui-btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.dpui-btn-outline {
  background: transparent;
  border-color: #d1d5db;
  color: #1f2937;
}
.dpui-btn-outline:hover:not(:disabled) {
  background: #f3f4f6;
}

.dpui-btn-ghost {
  background: transparent;
  color: #1f2937;
}
.dpui-btn-ghost:hover:not(:disabled) {
  background: #f3f4f6;
}

.dpui-btn-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}
.dpui-btn-md {
  height: 34px;
  padding: 0 14px;
  font-size: 14px;
}
.dpui-btn-lg {
  height: 42px;
  padding: 0 20px;
  font-size: 16px;
}
</style>
