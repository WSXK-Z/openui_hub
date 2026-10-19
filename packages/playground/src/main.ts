import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// 全量加载演示：一次性注册全部组件与指令
import DpUi from "@dp_ui/core";
// @dp_ui/chat 通过源码别名直连（dev），显式引入其基础样式（--dpc-* 变量 + 亮/暗主题）
import "../../chat/src/styles/index.css";

// 主题全局配置：数据参数形式，组件 comp 与 DpThemeProvider 均以它为默认值
createApp(App)
    .use(router)
    .use(DpUi, {
        themes: { default: {} },
        defaultMode: "system",
        persist: false,
    })
    .mount("#app");