/** @dp_ui/core 公共类型 */

/** 组件尺寸 */
export type DpSize = 'small' | 'medium' | 'large'

/** 语义类型 */
export type DpType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 需要布尔/字符串二态的值（如 loading） */
export type DpBooleanish = boolean | 'true' | 'false'

export * from './dp-props'
