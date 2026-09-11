<script setup lang="ts">
/**
 * reka-ui Checkbox 的统一封装（headless）。
 *
 * 渲染 `<button type="button" role="checkbox" aria-checked>`；空格/回车可切换，
 * `disabled` 语义与原生 `:disabled` 一致。外层用 reka `Label`（渲染 `<label>`）包裹，
 * 点标签文字即可切换 —— 与原生 `<input type="checkbox">` 的用法一致。
 *
 * `mt-[3px] mr-[3px] mb-[3px] ml-1` 复刻 Chrome UA 给 `input[type=checkbox]` 的
 * `margin: 3px 3px 3px 4px`，让替换后的行内对齐（与相邻文字的距离、行高）与原生完全一致。
 */
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <CheckboxRoot
    :model-value="model"
    :disabled="disabled"
    class="mt-[3px] mr-[3px] mb-[3px] ml-1 flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-sm border border-gray-300 bg-white data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-55"
    @update:model-value="(value) => (model = value === true)"
  >
    <CheckboxIndicator class="text-[10px] leading-none text-white">✓</CheckboxIndicator>
  </CheckboxRoot>
</template>
