import { inject, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { DsRequest } from './dataSource'
import type { DsRegistry } from '../types/registry'

/**
 * Schema 渲染上下文：由渲染器根组件（DsSchema / DsForm）provide，
 * 子节点（DsField / DsNode）通过 useDsContext 读取。
 * 覆盖三条数据通道：
 * - model：绑定数据（schema 的 field 写入这里）
 * - dataSource：request 实现（远程数据源使用）
 * - registry：组件注册表（schema 的 component 解析）
 */
export interface DsSchemaContext {
  /** 当前绑定数据（响应式对象） */
  model: Record<string, unknown>
  /** 组件注册表 */
  registry: DsRegistry
  /** 远程请求实现（默认 fetch 风格） */
  request: DsRequest
  /** 字段错误集（响应式；校验/提交时写入，渲染时按 field 读取） */
  errors: Record<string, string>
}

/** 上下文 key */
export const DsContextKey: InjectionKey<DsSchemaContext> = Symbol('ds-schema-context')

/** 根组件 provide 上下文 */
export function provideDsContext(ctx: DsSchemaContext): void {
  provide(DsContextKey, ctx)
}

/** 子节点读取上下文；不存在时抛错（保证 field 必须在 DsSchema/DsForm 内使用） */
export function useDsContext(): DsSchemaContext {
  const ctx = inject(DsContextKey)
  if (!ctx) {
    throw new Error('[@dp_ui/schema] 节点必须在 <DsSchema> 或 <DsForm> 内部渲染')
  }
  return ctx
}

/** 供不抛错的场景：可能返回 undefined */
export function tryUseDsContext(): DsSchemaContext | undefined {
  return inject(DsContextKey)
}

/** 把字段值绑定到 model（v-model 语义）：读取 + 写入 */
export interface DsFieldBinding {
  readonly: Ref<unknown>
  writable: Ref<unknown>
}

/**
 * 构建一个字段的可写响应式值：
 * - 读取：model 上 path 的值，空时回退 fallbackValue / 类型默认值
 * - 写入：写回 model 的 path
 */
export function useFieldValue(
  model: Record<string, unknown>,
  field: string,
  options: { valueType: 'string' | 'boolean' | 'number' | 'any'; fallbackValue?: unknown },
): Ref<unknown> {
  return {
    get value() {
      const raw = readModelPath(model, field)
      if (raw === undefined || raw === null) {
        if (options.fallbackValue !== undefined) return options.fallbackValue
        return defaultByType(options.valueType)
      }
      return raw
    },
    set value(next: unknown) {
      writeModelPath(model, field, next)
    },
  } as Ref<unknown>
}

/** 按“.”或“[n]”路径读取（简单实现，深路径委托 runtime/path） */
import { getPath, setPath } from './path'

function readModelPath(model: Record<string, unknown>, path: string): unknown {
  return getPath(model, path)
}

function writeModelPath(model: Record<string, unknown>, path: string, value: unknown): void {
  setPath(model, path, value)
}

function defaultByType(type: 'string' | 'boolean' | 'number' | 'any'): unknown {
  switch (type) {
    case 'string':
      return ''
    case 'boolean':
      return false
    case 'number':
      return undefined
    default:
      return undefined
  }
}
