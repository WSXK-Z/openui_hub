import type { App, Component, Directive, Plugin } from 'vue'

export type SFCWithInstall<T> = T & Plugin

/**
 * 给组件挂载 install 方法，用于全量 `app.use(DpUi)` 注册。
 * 组件的 name 由 `defineOptions({ name: 'DpXxx' })` 提供。
 */
export function withInstall<T extends Component>(comp: T, name?: string): SFCWithInstall<T> {
  const compName = name ?? (comp as { name?: string }).name
  if (compName) {
    ;(comp as unknown as SFCWithInstall<T>).install = (app: App) => {
      app.component(compName, comp)
    }
  }
  return comp as unknown as SFCWithInstall<T>
}

/** 批量注册插件化组件与指令 */
export function createInstaller(
  components: Array<Component & Plugin>,
  directives?: Record<string, Directive>,
): Plugin {
  const install = (app: App) => {
    for (const comp of components) {
      if (typeof (comp as Plugin).install === 'function') {
        app.use(comp as Plugin)
      } else if (comp.name) {
        app.component(comp.name, comp)
      }
    }
    if (directives) {
      for (const [name, dir] of Object.entries(directives)) {
        app.directive(name, dir)
      }
    }
  }
  return { install }
}
