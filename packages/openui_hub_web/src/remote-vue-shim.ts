/**
 * 远程组件的 import map 目标（见 index.html）。
 *
 * hub 上的组件产物是预编译 ESM，内部为裸 `import "vue"`。把它解析到本模块，
 * 远程组件拿到的就是宿主这份 vue（Vite 会把本模块里的 `vue` 解析成同一份依赖模块），
 * 避免双 Vue 实例导致响应式/依赖注入互不相通。
 */
export * from 'vue'
