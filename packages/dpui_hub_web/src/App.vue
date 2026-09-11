<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

import { useAuth } from './composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user, permissions, isAdmin, sync, signOut } = useAuth()

/** 非 admin 访问 /admin/** 被守卫弹回首页时的提示。 */
const denied = computed(() => route.query.denied === '1')
/** 首页瀑布流需要更宽的容器；其余页面维持阅读宽度。 */
const wide = computed(() => route.name === 'home')

async function onLogout() {
  await signOut()
  await router.push('/login')
}

onMounted(sync)
watch(() => route.path, sync)
</script>

<template>
  <header class="border-b border-gray-200 bg-white px-6 py-3">
    <nav class="flex items-center gap-6">
      <router-link to="/" class="text-lg font-bold text-blue-600">dpui_hub</router-link>
      <router-link to="/" class="text-sm text-gray-600 hover:text-gray-900">组件列表</router-link>
      <template v-if="isAdmin">
        <router-link to="/admin/users" class="text-sm text-gray-600 hover:text-gray-900">用户</router-link>
        <router-link to="/admin/tokens" class="text-sm text-gray-600 hover:text-gray-900">令牌</router-link>
      </template>

      <div class="ml-auto flex items-center gap-3 text-sm">
        <DropdownMenuRoot v-if="user">
          <DropdownMenuTrigger
            class="-mx-1 flex items-center gap-3 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-gray-50 [font-family:inherit]"
            aria-label="账号菜单"
            title="账号菜单"
          >
            <span>{{ user.username }}</span>
            <span
              class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
              :title="permissions.length ? `令牌权限：${permissions.join('、')}` : '无令牌权限'"
            >
              {{ user.role }}
            </span>
            <span class="text-[10px] text-gray-400" aria-hidden="true">▾</span>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              :side-offset="6"
              class="z-50 min-w-32 rounded border border-gray-200 bg-white py-1 shadow-lg"
            >
              <DropdownMenuLabel class="px-3 py-1 text-xs text-gray-400">
                {{ user.username }} · {{ user.role }}
              </DropdownMenuLabel>
              <DropdownMenuSeparator class="my-1 h-px bg-gray-100" />
              <template v-if="isAdmin">
                <DropdownMenuItem
                  class="cursor-pointer px-3 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                  @select="() => router.push('/admin/users')"
                >
                  用户
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="cursor-pointer px-3 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                  @select="() => router.push('/admin/tokens')"
                >
                  令牌
                </DropdownMenuItem>
                <DropdownMenuSeparator class="my-1 h-px bg-gray-100" />
              </template>
              <DropdownMenuItem
                class="cursor-pointer px-3 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                @select="onLogout"
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <router-link v-else to="/login" class="text-blue-600 hover:text-blue-700">登录</router-link>
      </div>
    </nav>
  </header>
  <main class="mx-auto p-6" :class="wide ? 'max-w-[1600px]' : 'max-w-4xl'">
    <p v-if="denied" class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      无权限访问管理页（需要 admin 角色）。
    </p>
    <router-view />
  </main>
</template>
