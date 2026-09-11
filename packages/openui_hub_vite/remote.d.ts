/**
 * `dpui-hub:<@scope/name>` 虚拟模块的类型声明（shorthand ambient module）。
 *
 * 远程组件由 hubVite 在构建期解析（虚拟模块），TypeScript 无从推断，故提供通配声明：
 * 该前缀下的所有模块导入项按 any 处理。使用方在 tsconfig 中启用即可，无需生成文件：
 *
 * ```json
 * { "compilerOptions": { "types": ["@dp_ui/hub_vite/remote"] } }
 * ```
 *
 * 需要精确类型时改用 `dpui use <pkg> --mode source`（本地源码），
 * 或 `dpui use <pkg> --with-types` 生成项目内声明文件。
 */
declare module 'dpui-hub:*'
