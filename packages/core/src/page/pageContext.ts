import { inject, provide, type InjectionKey } from 'vue'

export interface PageContext {
  title?: string
  meta?: Record<string, unknown>
}

export const pageContextKey: InjectionKey<PageContext> = Symbol('dp-page')

export function providePageContext(context: PageContext) {
  provide(pageContextKey, context)
}

export function usePage(): PageContext | undefined {
  return inject(pageContextKey, undefined)
}
