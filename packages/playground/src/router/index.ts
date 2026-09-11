import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import OnDemandPage from "../pages/OnDemandPage.vue";
import ComponentsPage from "../pages/ComponentsPage.vue";
import SchemaDemoPage from "../pages/SchemaDemoPage.vue";
import ChatPage from "../pages/ChatPage.vue";
import DocLayout from "../docs/DocLayout.vue";
import ButtonDocPage from "../docs/pages/ButtonDocPage.vue";
import PlaceholderDocPage from "../docs/pages/PlaceholderDocPage.vue";

// 所有路由相关事务集中在 page 层（设计文档 §5）：每个路由对应一个「page」组件
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomePage, meta: { title: "首页" } },
    {
      path: "/on-demand",
      name: "on-demand",
      component: OnDemandPage,
      meta: { title: "按需加载演示" },
    },
    {
      path: "/components",
      name: "components",
      component: ComponentsPage,
      meta: { title: "组件大全" },
    },
    {
      path: "/schema-demo",
      name: "schema-demo",
      component: SchemaDemoPage,
      meta: { title: "@dp_ui/schema · 数据驱动演示" },
    },
    {
      path: "/chat",
      name: "chat",
      component: ChatPage,
      meta: { title: "@dp_ui/chat · 聊天演示" },
    },
    {
      path: "/docs",
      component: DocLayout,
      meta: { title: "组件文档" },
      children: [
        { path: "", redirect: "/docs/button" },
        {
          path: "button",
          name: "doc-button",
          component: ButtonDocPage,
          meta: { title: "Button 按钮 · 组件文档" },
        },
        {
          path: ":name",
          name: "doc-component",
          component: PlaceholderDocPage,
          meta: { title: "组件文档" },
        },
      ],
    },
  ],
});

export default router;
