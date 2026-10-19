import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import OnDemandPage from "../pages/OnDemandPage.vue";
import ComponentsPage from "../pages/ComponentsPage.vue";
import SchemaDemoPage from "../pages/SchemaDemoPage.vue";
import ChatPage from "../pages/ChatPage.vue";
import AgentKitPage from "../pages/AgentKitPage.vue";
import CoolNeutralPage from "../pages/CoolNeutralPage.vue";
import DocLayout from "../docs/DocLayout.vue";
import ComponentDocPage from "../docs/pages/ComponentDocPage.vue";

// 所有路由集中在此：每个路由对应一个「page」组件（设计文档 §5）
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(to, _from, savedPosition) {
        if (savedPosition) return savedPosition;
        if (to.hash) return { el: to.hash, top: 80, behavior: "smooth" };
        return { top: 0 };
    },
    routes: [
        { path: "/", redirect: "/docs/button" },
        {
            path: "/home",
            name: "home",
            component: HomePage,
            meta: { title: "核心组件演示" },
        },
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
            path: "/agent-kit",
            name: "agent-kit",
            component: AgentKitPage,
            meta: { title: "@dp_ui/chat · Agent 原语" },
        },
        {
            path: "/cool-neutral",
            name: "cool-neutral",
            component: CoolNeutralPage,
            meta: { title: "@dp_ui/core · Cool Neutral 主题" },
        },
        {
            path: "/docs",
            component: DocLayout,
            meta: { title: "组件文档" },
            children: [
                { path: "", redirect: "/docs/button" },
                {
                    path: ":name",
                    name: "doc-component",
                    component: ComponentDocPage,
                    meta: { title: "组件文档" },
                },
            ],
        },
        { path: "/:pathMatch(.*)*", redirect: "/" },
    ],
});

router.afterEach((to) => {
    const title = to.meta.title as string | undefined;
    document.title = title ? `${title} · dp_ui` : "dp_ui";
});

export default router;
