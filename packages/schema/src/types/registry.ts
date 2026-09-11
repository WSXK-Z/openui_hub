import type { Component } from 'vue'
import type { DsStyle } from './schema'

/**
 * 注册表条目：把 schema 里的 `component` 名字解析为真实组件，
 * 并携带适配元数据（值类型、options 注入键、props 契约）。
 */
export interface DsRegistryEntry {
  /** 实际渲染的组件 */
  component: Component
  /**
   * props 契约：
   * - `dp`（默认）：组件遵循 @dp_ui/core 的 `{ theme?: DpThemeProps; comp?: Partial<Comp> }` + v-model；
   *   渲染时把 schema.style 映射为 theme、schema.props 映射为 comp。
   * - `native`：组件接收普通 props（class/style 透传），schema.props 直接展开。
   */
  contract?: 'dp' | 'native'
  /** 值类型（字段受控时决定空值归一化）；默认 'string' */
  valueType?: 'string' | 'boolean' | 'number' | 'any'
  /** 数据源选项写入组件 props 的键名（contract=dp 时为 comp 内键）；默认 'options' */
  optionsKey?: string
  /** 组件是否渲染默认插槽内容（容器/文本类） */
  renderChildren?: boolean
  /** 描述（调试/文档用） */
  description?: string
}

/** 由 entry 计算出的渲染期解析结果（含样式元数据） */
export interface DsResolvedEntry {
  entry: DsRegistryEntry
  /** 归一化后的样式元数据 */
  style: DsStyle | undefined
}

/** 组件注册表（运行时查找 `component` 名） */
export class DsRegistry {
  private readonly entries = new Map<string, DsRegistryEntry>()

  register(name: string, entry: DsRegistryEntry): this {
    this.entries.set(name, entry)
    return this
  }

  registerMany(map: Record<string, DsRegistryEntry>): this {
    for (const [name, entry] of Object.entries(map)) {
      this.register(name, entry)
    }
    return this
  }

  has(name: string): boolean {
    return this.entries.has(name)
  }

  get(name: string): DsRegistryEntry | undefined {
    return this.entries.get(name)
  }

  /** 返回全部已注册名 */
  names(): string[] {
    return [...this.entries.keys()]
  }
}

/** 全局默认注册表：@dp_ui/core adapter 会注册进来；也可传入自定义 registry 到渲染器 */
export const defaultRegistry = new DsRegistry()
