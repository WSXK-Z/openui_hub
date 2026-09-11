import { defineComponent, h, type PropType } from 'vue'

const styles = {
  info: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-amber-500 text-black',
  danger: 'bg-red-500 text-white',
} as const

/**
 * unocss 原子类组件示例（无需任何手写 CSS）：
 * 所有类名以字符串常量出现，构建期被 unocss 扫描并生成样式，并入 style.css。
 */
export const Tag = defineComponent({
  name: 'Tag',
  props: {
    type: { type: String as PropType<keyof typeof styles>, default: 'info' },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'span',
        {
          class: [
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            styles[props.type],
          ],
        },
        slots.default?.() ?? [],
      )
  },
})

export default {
  name: '@oui/tag',
  title: 'Tag',
  description: 'openui_hub 样例标签组件（UnoCSS 原子类）',
  meta: {},
  component: Tag,
}
