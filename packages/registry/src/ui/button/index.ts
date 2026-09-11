/**
 * 测试按钮 组件入口 —— hub 组件契约：
 * - 默认导出组件描述对象 { name, title, description, meta, component }：component 为组件本体，
 *   运行时/预览按它渲染；其余字段为展示与扩展元信息。
 * - 具名导出组件本体，供构建期使用方 `import { Button } from 'oui-hub:@test/button'`。
 * - 只依赖 peer 声明的依赖与组件目录内文件（构建期会把裸导入改写为宿主解析结果）。
 */
import Button from './Button.vue'

export { Button }

export default {
  name: "@test/button",
  title: "测试按钮",
  description: "",
  meta: {},
  component: Button,
}
