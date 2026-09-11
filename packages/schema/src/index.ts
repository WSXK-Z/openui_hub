// @dp_ui/schema —— 数据驱动 UI 编排层
// 入口：导出 schema 类型系统、渲染引擎（DsSchema / DsForm / DsNode）、
// 注册中心（DsRegistry / defaultRegistry / installDpUi）与运行时工具。
export * from './types'
export { installDpUi } from './adapters/dpUi'

// 运行时纯函数
export { parsePath, getPath, setPath, defaultValueFor } from './runtime/path'
export { evalCondition } from './runtime/condition'
export {
  buildOptionsLoader,
  buildRemoteInit,
  type DsRequest,
} from './runtime/dataSource'
export { validateField, validateFields, collectFields } from './runtime/validate'
export { normalizeStyle, toCssVars } from './runtime/style'
export {
  useDsContext,
  tryUseDsContext,
  useFieldValue,
  DsContextKey,
  type DsSchemaContext,
} from './runtime/context'
export { useFieldOptions } from './composables/useFieldOptions'

// 渲染引擎组件（公共入口只暴露 DsSchema / DsForm；
// DsNode / DsControl 为内部递归/控件渲染实现，不对外导出以免与类型名冲突）
export { default as DsSchema } from './components/DsSchema.vue'
export { default as DsForm } from './components/DsForm.vue'
