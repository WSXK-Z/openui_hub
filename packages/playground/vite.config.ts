import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// @dp_ui/core 演示应用
// - `@dp_ui/core` → 核心组件库源码入口（dev 直接使用源码，无需先构建 dist）
// - `@dp_ui/chat` → 聊天组件库源码入口（同理 dev 直连源码）
// - `@` → 库源码 src（用于解析 @dp_ui/core 内部 "@/..." 导入；本应用自身使用相对导入）
// - `@dp_ui/schema` → 数据驱动层源码入口（同理 dev 直连源码）
export default defineConfig({
  plugins: [vue(), vueDevTools(), UnoCSS()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../core/src", import.meta.url)),
      "@dp_ui/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
      "@dp_ui/chat": fileURLToPath(new URL("../chat/src/index.ts", import.meta.url)),
      "@dp_ui/schema": fileURLToPath(new URL("../schema/src/index.ts", import.meta.url)),
    },
  },
});
