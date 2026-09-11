import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// 全量加载演示：一次性注册全部组件与指令
import DpUi from "@dp_ui/core";
// @dp_ui/chat 通过源码别名直连（dev），显式引入其基础样式（--dpc-* 变量 + 亮/暗主题）
import "../../chat/src/styles/index.css";

createApp(App).use(router).use(DpUi).mount("#app");
