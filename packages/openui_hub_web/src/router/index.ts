import { createRouter, createWebHistory } from 'vue-router'

import { getSession } from '../api'
import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import PackagePage from '../pages/PackagePage.vue'
import TokensPage from '../pages/TokensPage.vue'
import UsersPage from '../pages/UsersPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    // 约定：scope 参数不含 @（页面内拼 @${scope}）
    { path: '/pkg/:scope/:name', name: 'pkg', component: PackagePage, props: true },
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: UsersPage,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/tokens',
      name: 'admin-tokens',
      component: TokensPage,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach((to) => {
  const session = getSession()
  if (to.meta.requiresAuth && !session) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && session?.user.role !== 'admin') {
    return { path: '/', query: { denied: '1' } }
  }
  return true
})
