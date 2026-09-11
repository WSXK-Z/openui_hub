/**
 * @openui_hub/plugin_vite 公共入口 —— 双插件：
 * - 使用者（消费端）构建期远程组件加载：`hubVite()`（默认导出）
 * - 组件开发者打包插件：`hubPackage()`（打成符合规格的可发布包）
 */

export * from './consumer'
export { default } from './consumer'
export { hubPackage } from './package'
export type { HubPackageConfig, HubComponentConfig } from './package'
