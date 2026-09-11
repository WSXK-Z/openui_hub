import type { ClassValue, StyleValue } from 'vue'
import type { DpcSize, DpcType } from './index'

/**
 * 统一的外观数据（theme）：只影响外观、不影响行为。
 * 通过组件上的 `theme` prop 传入；`style` / `class` 等原生属性照常透传到根元素。
 * 工具函数负责把 theme 合并到根元素。
 */
export interface DpcThemeProps {
  /** 追加类名（与透传 class 合并） */
  class?: ClassValue
  /** 追加内联样式（与透传 style、cssVars 合并） */
  style?: StyleValue
  /** 尺寸 */
  size?: DpcSize
  /** 颜色语义 */
  variant?: DpcType
  /** 圆角 */
  round?: boolean
  /** 块级 */
  block?: boolean
  /** 边框 */
  bordered?: boolean
  /** CSS 变量覆盖，写入根元素；key 省略 `--dpc-` 前缀则自动补齐 */
  cssVars?: Record<string, string | number>
}

/** 组件统一 props：`theme`（外观数据）+ `comp`（组件业务数据，可部分传入，缺失项由组件默认值补齐）。原生 style/class 不进 props，直接透传。 */
export type DpcProps<Comp extends object = object> = {
  theme?: DpcThemeProps
  comp?: Partial<Comp>
}
