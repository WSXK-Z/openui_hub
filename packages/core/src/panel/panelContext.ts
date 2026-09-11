import { inject, provide, type InjectionKey } from 'vue'

export interface PanelContext {
  id: string
  title?: string
}

export const panelContextKey: InjectionKey<PanelContext> = Symbol('dp-panel')

export function providePanelContext(context: PanelContext) {
  provide(panelContextKey, context)
}

export function usePanel(): PanelContext | undefined {
  return inject(panelContextKey, undefined)
}
