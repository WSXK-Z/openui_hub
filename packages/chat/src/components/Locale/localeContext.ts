import { inject, provide, type InjectionKey } from 'vue'
import type { DpcLocaleMessages, DpcLocaleName } from './locales'
import { dpcLocaleMap, dpcLocaleZhCN } from './locales'

export interface DpcLocaleContext {
  name?: DpcLocaleName
  messages: DpcLocaleMessages
}

export const dpcLocaleContextKey: InjectionKey<DpcLocaleContext> = Symbol('dpc-locale')

export function provideDpcLocale(context: DpcLocaleContext) {
  provide(dpcLocaleContextKey, context)
}

/** 覆盖选项：可局部覆盖部分文案 */
export interface DpcLocaleOptions {
  name?: DpcLocaleName
  messages?: Partial<DpcLocaleMessages>
}

/**
 * 读取当前 locale 文案（默认 zh-CN；DpcLocale 注入 + 局部覆盖合并）。
 * 返回的 messages 在 DpcLocale 包裹下是响应式的。
 */
export function useDpcLocale(options: DpcLocaleOptions = {}): DpcLocaleMessages {
  const injected = inject(dpcLocaleContextKey, undefined)
  const base = injected?.messages ?? dpcLocaleMap[options.name ?? 'zh-CN'] ?? dpcLocaleZhCN
  return { ...base, ...options.messages }
}
