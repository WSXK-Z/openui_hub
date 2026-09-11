<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="pg-app">
    <nav class="pg-nav">
      <RouterLink to="/">全量加载 · 首页</RouterLink>
      <RouterLink to="/docs/button">组件文档 · Naive 样板</RouterLink>
      <RouterLink to="/components">组件大全</RouterLink>
      <RouterLink to="/on-demand">按需加载 · 演示</RouterLink>
      <RouterLink to="/schema-demo">数据驱动 · @dp_ui/schema</RouterLink>
      <RouterLink to="/chat">聊天 · @dp_ui/chat</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.pg-app {
  min-height: 100vh;
}

.pg-nav {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--dp-color-border, #e5e7eb);
}

.pg-nav a {
  padding: 4px 10px;
  border-radius: var(--dp-radius-sm, 4px);
  color: var(--dp-color-text-secondary, #6b7280);
  font-size: 14px;
}

.pg-nav a.router-link-active {
  color: var(--dp-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--dp-color-primary, #3b82f6) 8%, transparent);
}
</style>
