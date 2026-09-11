/**
 * 全站共享的登录态（模块级单例）。
 *
 * App 顶栏与各页面（首页卡片管理入口、详情页管理区）看到的是同一份 user/permissions，
 * 权限判定只此一处 `isAdmin`，避免各页面各写一份不一致的判权逻辑。
 */

import { computed, ref } from 'vue'

import { clearSession, fetchMe, getSession, logout, setSession, type AuthUser, type HubSession } from '../api'

const session = ref<HubSession | null>(getSession())
const user = ref<AuthUser | null>(session.value?.user ?? null)
/** /api/auth/me 返回的权限并集（顶栏提示用）。 */
const permissions = ref<string[]>([])
const isAdmin = computed(() => user.value?.role === 'admin')

/** 已与 /api/auth/me 同步过的令牌，避免每次路由切换重复请求。 */
let syncedToken: string | null = null

/** 以本地会话为准刷新登录态，并向服务端核对用户名/角色（可能已被管理员改动）。 */
async function sync(): Promise<void> {
  session.value = getSession()
  if (!session.value) {
    user.value = null
    permissions.value = []
    syncedToken = null
    return
  }
  user.value = session.value.user
  if (syncedToken === session.value.token) return
  syncedToken = session.value.token
  try {
    const me = await fetchMe()
    user.value = me.user
    permissions.value = me.permissions
    if (me.user.role !== session.value.user.role || me.user.username !== session.value.user.username) {
      // 服务端改了用户名/角色：同步本地会话，守卫据此放行
      setSession({ ...session.value, user: me.user })
      session.value = getSession()
    }
  } catch {
    // 401 已由 request() 清除会话并跳转 /login；其余错误保留本地会话展示
  }
}

/** 退出登录：服务端失败也照常清理本地会话。 */
async function signOut(): Promise<void> {
  try {
    await logout()
  } catch {
    // 会话可能已失效，本地照常清理
  }
  clearSession()
  syncedToken = null
  await sync()
}

export function useAuth() {
  return { session, user, permissions, isAdmin, sync, signOut }
}
