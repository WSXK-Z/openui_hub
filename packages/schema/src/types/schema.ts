/**
 * @dp_ui/schema 公共类型：数据驱动 UI 的 schema 元数据模型。
 *
 * 核心理念：
 * 1. schema 节点树描述「渲染什么 + 怎么呈现」——`component` 决定组件、`props`/`style`
 *    元数据决定结构与样式；
 * 2. `field` 绑定数据（model 上的字段路径），`dataSource` 提供交互数据（选项/远程），
 *    `visible`/`disabled` 表达联动条件。
 */

/** 组件尺寸（与 @dp_ui/core 的 DpSize 语义一致，adapter 负责映射） */
export type DsSize = 'small' | 'medium' | 'large'

/** 语义变体（与 @dp_ui/core 的 DpType 语义一致） */
export type DsType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/**
 * 样式元数据：由 schema 声明、经 adapter 映射到具体组件。
 * 与渲染层解耦：@dp_ui/core 组件会被映射为 `{ theme: DpThemeProps }`，原生组件被映射为 class/style。
 */
export interface DsStyle {
  /** 追加类名 */
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
  /** 追加内联样式 */
  style?: string | Record<string, string | number>
  /** CSS 变量覆盖（key 省略前缀自动补 `--dp-`） */
  cssVars?: Record<string, string | number>
  /** 尺寸 */
  size?: DsSize
  /** 语义变体 */
  variant?: DsType
  /** 圆角 */
  round?: boolean
  /** 块级 */
  block?: boolean
  /** 边框 */
  bordered?: boolean
  /** 布局：栅格列宽提示（由使用方容器解释，如 1~24） */
  span?: number
  /** 布局：是否占整行 */
  full?: boolean
}

/** 表达式求值上下文 */
export interface DsEvalCtx {
  /** 绑定的数据对象 */
  model: Record<string, unknown>
}

/**
 * 条件表达式：`visible` / `disabled` 等。
 * 支持三种形态：
 * - 布尔值（字面量）
 * - 函数（接收求值上下文，返回布尔）
 */
export type DsCondition = boolean | ((ctx: DsEvalCtx) => boolean)

/** 选项项 */
export interface DsOption {
  label: string
  value: string | number
  disabled?: boolean
}

/** 选项提供者：静态数组或惰性函数（可返回 Promise，适配远程/异步） */
export type DsOptionsProvider = DsOption[] | (() => DsOption[] | Promise<DsOption[]>)

/** 远程数据源描述（v0 提供 fetch 风格；可通过 renderer 注入 request 实现替换） */
export interface DsRemoteSource {
  url: string
  method?: 'GET' | 'POST'
  /** 请求参数；值为函数时接收求值上下文动态生成 */
  params?: Record<string, unknown> | ((ctx: DsEvalCtx) => Record<string, unknown>)
  /** 把远程响应映射为 DsOption[] */
  map: (payload: unknown) => DsOption[]
}

/**
 * 数据源：为字段/组件提供交互数据（如下拉选项）。
 * - `options`：静态或惰性提供选项
 * - `remote`：远程拉取并映射为选项
 * - `dependsOn`：监听依赖字段，变化时自动重新加载（级联场景）
 * - `showLoading`：加载中状态注入（保留扩展）
 */
export interface DsDataSource {
  options?: DsOptionsProvider
  remote?: DsRemoteSource
  /** 依赖字段路径列表（相对 model），任一变化触发重载 */
  dependsOn?: string[]
  /** 加载完成后将选项写入组件的哪个 props 键（默认 'options'） */
  optionsKey?: string
  /** 是否立即加载（默认 true） */
  immediate?: boolean
}

/** 校验规则 */
export interface DsRule {
  required?: boolean
  /** 正则匹配；字符串会被 new RegExp 编译 */
  pattern?: RegExp | string
  /** 自定义校验：返回 true 通过 / 字符串为错误信息 / Promise */
  validator?: (value: unknown, ctx: DsEvalCtx) => boolean | string | Promise<boolean | string>
  /** 错误提示 */
  message?: string
}

/**
 * Schema 节点（统一模型）：
 * 容器、字段、展示组件都收敛为同一节点——`component` 决定用什么渲染，
 * 有 `children` 即容器，有 `field` 即受控数据字段，`dataSource` 注入交互数据。
 */
export interface DsNode {
  /** 节点唯一键 */
  key?: string
  /** 组件注册名（见 registry） */
  component: string
  /** 传给组件的业务 props（@dp_ui/core 组件映射为 comp，原生组件直接透传） */
  props?: Record<string, unknown>
  /** 样式元数据（schema 决定样式） */
  style?: DsStyle
  /** 子节点（容器用） */
  children?: DsNode[]
  /** 绑定 model 字段路径（如 'user.name'、'items[0].title'）；存在即作为受控字段渲染 */
  field?: string
  /** 字段标签 */
  label?: string
  /** 字段帮助/说明 */
  help?: string
  /** 校验规则（配合 field 使用） */
  rules?: DsRule[]
  /** 数据源：为选择类组件提供选项等交互数据 */
  dataSource?: DsDataSource
  /** 显隐条件 */
  visible?: DsCondition
  /** 禁用条件 */
  disabled?: DsCondition
  /** 值类型（覆盖 registry 内默认；决定空值归一化与写入类型） */
  valueType?: 'string' | 'boolean' | 'number' | 'any'
  /** 默认值：model 中该字段为空时回退展示 */
  fallbackValue?: unknown
  /** 当组件使用默认插槽展示纯文本时传入（如按钮/标签文本） */
  text?: string
}

/** 根渲染入参：单个节点或节点数组 */
export type DsSchemaInput = DsNode | DsNode[]
