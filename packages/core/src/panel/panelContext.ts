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

/** 页面内可用的面板停靠位置（参照 Naive UI Panel） */
export type DpPanelAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export const dpPanelAnchors: readonly DpPanelAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'center',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

/** 页面暴露给面板的组句柄：用于按名称查找、置顶与批量操作 */
export interface DpPanelGroupHandle {
  id: string
  name: string | undefined
  collapse: () => void
  expand: () => void
  reset: () => void
  bringToFront: () => void
  getRect: () => DOMRect | null
  getZIndex: () => number | null
}

export interface DpPanelStorage {
  getItem: (key: string) => string | null | undefined
  setItem: (key: string, value: string) => void
}

export interface DpPanelPersistContext {
  namespace?: string
  storage?: DpPanelStorage
}

export interface DpPanelGroupContext {
  registerPanel: (panel: DpPanelGroupHandle) => void
  unregisterPanel: (id: string) => void
  getPanels: () => DpPanelGroupHandle[]
  getPanel: (name: string) => DpPanelGroupHandle | undefined
  bringToFront: (id: string) => number | null
  persist: DpPanelPersistContext
}

export const dpPanelGroupContextKey: InjectionKey<DpPanelGroupContext> = Symbol('dp-panel-group')

export function provideDpPanelGroupContext(context: DpPanelGroupContext) {
  provide(dpPanelGroupContextKey, context)
}

export function useDpPanelGroup(): DpPanelGroupContext | undefined {
  return inject(dpPanelGroupContextKey, undefined)
}
