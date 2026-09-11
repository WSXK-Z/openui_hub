<script setup lang="ts">
/**
 * reka-ui Select 的统一封装（headless：视觉全部由调用方的 UnoCSS 类决定）。
 *
 * 三处用法（卡片版本槽 / 详情页版本 / 用户页角色）只有触发器与列表项的类名不同，
 * Root→Trigger→Value→Icon→Portal→Content→Viewport→Item→ItemText 的结构、键盘交互与
 * 选中态逻辑完全一致，故收敛到本组件，避免三份副本各自漂移。
 *
 * 行为要点：
 * - 触发器渲染 `<button type="button">`，带 `data-no-nav`：卡片双击守卫 `closest('[data-no-nav]')` 因此生效；
 * - 面板默认 Teleport 到 body：不受卡片 `overflow-hidden` 裁切，也脱离父级层叠上下文（z-50）；
 * - 未打开面板时 reka 会把列表项挂进一个游离 DocumentFragment，SelectValue 因此仍能显示当前选中项文本；
 * - 键盘：Enter/Space 打开，方向键移动高亮，Esc/点外关闭（由 reka 内部 DismissableLayer 处理）。
 *
 * 样式分层：基础类只负责结构与高亮，尺寸/字体/颜色一律由 triggerClass / itemClass 传入，
 * 避免 UnoCSS 生成顺序不确定造成「同名工具类相互覆盖」。
 */
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'

export interface HubSelectOption {
  value: string
  label?: string
}

const props = withDefaults(
  defineProps<{
    /** 字符串数组或 `{ value, label }` 列表。 */
    options: readonly (string | HubSelectOption)[]
    /** 触发器类名：尺寸、边框、字体由调用方钉死。 */
    triggerClass?: string
    /** 列表项类名：字体字号由调用方钉死。 */
    itemClass?: string
    disabled?: boolean
    /** 未选中任何项时的占位文本。 */
    placeholder?: string
    /** 触发器的可读名称（无可视 label 时的无障碍名称）。 */
    ariaLabel?: string
    /** 触发器的悬浮提示（与原生 `<select title>` 一致）。 */
    title?: string
  }>(),
  { triggerClass: '', itemClass: '', disabled: false, placeholder: '', ariaLabel: '', title: '' },
)

/** 根节点是多根片段，属性无法自动落到触发器上，改为显式转发到 SelectTrigger。 */
defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ required: true })

const items = computed(() =>
  props.options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : { value: option.value, label: option.label ?? option.value },
  ),
)
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger
      v-bind="$attrs"
      :class="triggerClass"
      :aria-label="ariaLabel || undefined"
      :title="title || undefined"
      data-no-nav
      class="inline-flex items-center justify-between gap-0.5 overflow-hidden text-left"
    >
      <SelectValue :placeholder="placeholder" class="truncate" />
      <SelectIcon class="shrink-0 text-[8px] leading-none text-gray-400" aria-hidden="true">▾</SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="2"
        class="z-50 max-h-72 overflow-hidden rounded border border-gray-300 bg-white shadow-md"
      >
        <SelectViewport class="p-0.5">
          <SelectItem
            v-for="option in items"
            :key="option.value"
            :value="option.value"
            :class="itemClass"
            class="relative flex cursor-pointer items-center rounded py-1 pl-6 pr-2 leading-none outline-none select-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700"
          >
            <SelectItemIndicator class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
              ✓
            </SelectItemIndicator>
            <SelectItemText class="truncate">{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
