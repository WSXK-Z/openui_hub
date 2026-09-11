import { defineConfig, presetMini, transformerDirectives, transformerVariantGroup } from 'unocss'

// 组件开发 unocss 配置：presetMini 产出的原子类编译为具体值（自包含，可远程分发）；
// 若组件需主题变量类（如引用 --dp-*），请自行在组件样式/文档中携带 token 定义。
// vite module 收集在 lib 构建下不可靠，显式 filesystem 扫描组件源码。
export default defineConfig({
  content: {
    filesystem: ['./src/**/*.{ts,vue}'],
  },
  presets: [presetMini()],
  transformers: [transformerVariantGroup(), transformerDirectives()],
})
