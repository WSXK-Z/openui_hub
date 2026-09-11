/** @dp_ui/chat 公共类型 */

/** 组件尺寸 */
export type DpcSize = 'small' | 'medium' | 'large'

/** 语义类型 */
export type DpcType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 需要布尔/字符串二态的值（如 loading） */
export type DpcBooleanish = boolean | 'true' | 'false'

export * from './dpc-props'
export * from './chat'
