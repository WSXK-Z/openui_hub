<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  Label,
} from 'reka-ui'

import {
  createUser,
  deleteUser,
  fetchUsers,
  formatTime,
  updateUser,
  type HubRole,
  type HubUser,
} from '../api'
import HubSelect from '../components/HubSelect.vue'

/** 角色选项（与原生 `<option>` 列表一致，模块级常量避免每次渲染新建数组）。 */
const ROLE_OPTIONS = ['publisher', 'admin'] as const

const users = ref<HubUser[]>([])
const loading = ref(true)
const error = ref('')
const notice = ref('')

const form = reactive<{ username: string; password: string; role: HubRole }>({
  username: '',
  password: '',
  role: 'publisher',
})
const creating = ref(false)

/** 正在等待后端响应的用户 id（行内操作期间禁用该行）。 */
const busyId = ref<number | null>(null)
const resetTarget = ref<number | null>(null)
const resetPassword = ref('')
/** 待删除用户：非 null 时 AlertDialog 打开（受控，便于成功后关闭/失败时保持打开显示错误）。 */
const deleteTarget = ref<HubUser | null>(null)

function report(e: unknown) {
  error.value = e instanceof Error ? e.message : String(e)
}

/** 重新拉取列表；`initial` 为 true 时同时驱动「加载中…」占位。 */
async function load(initial = false) {
  if (initial) loading.value = true
  try {
    users.value = await fetchUsers()
    error.value = ''
  } catch (e) {
    report(e)
  } finally {
    if (initial) loading.value = false
  }
}

async function create() {
  creating.value = true
  error.value = ''
  notice.value = ''
  try {
    const created = await createUser({
      username: form.username.trim(),
      password: form.password,
      role: form.role,
    })
    await load()
    notice.value = `已创建用户 ${created.username}（${created.role}）`
    form.username = ''
    form.password = ''
    form.role = 'publisher'
  } catch (e) {
    report(e)
  } finally {
    creating.value = false
  }
}

async function changeRole(user: HubUser, role: string) {
  if (role !== 'admin' && role !== 'publisher') return
  if (role === user.role) return
  busyId.value = user.id
  error.value = ''
  notice.value = ''
  try {
    await updateUser(user.id, { role })
    await load()
    notice.value = `已将 ${user.username} 的角色改为 ${role}`
  } catch (e) {
    // 重拉列表以还原选择器（如「不得降级最后一个 admin」时后端未改动）
    await load()
    report(e)
  } finally {
    busyId.value = null
  }
}

function startReset(user: HubUser) {
  resetTarget.value = user.id
  resetPassword.value = ''
  error.value = ''
}

async function submitReset(user: HubUser) {
  if (!resetPassword.value) {
    error.value = '请输入新密码'
    return
  }
  busyId.value = user.id
  error.value = ''
  notice.value = ''
  try {
    await updateUser(user.id, { password: resetPassword.value })
    notice.value = `已重置 ${user.username} 的密码`
    resetTarget.value = null
    resetPassword.value = ''
  } catch (e) {
    report(e)
  } finally {
    busyId.value = null
  }
}

async function remove(user: HubUser) {
  busyId.value = user.id
  error.value = ''
  notice.value = ''
  try {
    await deleteUser(user.id)
    deleteTarget.value = null
    await load()
    notice.value = `已删除用户 ${user.username}`
  } catch (e) {
    report(e)
  } finally {
    busyId.value = null
  }
}

onMounted(() => load(true))
</script>

<template>
  <section>
    <h1 class="text-lg font-bold">用户</h1>

    <form
      class="mt-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-4"
      @submit.prevent="create"
    >
      <Label class="flex flex-col gap-1 text-[13px] text-gray-600">
        用户名
        <input
          v-model="form.username"
          type="text"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
        />
      </Label>
      <Label class="flex flex-col gap-1 text-[13px] text-gray-600">
        密码
        <input
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
        />
      </Label>
      <Label class="flex flex-col gap-1 text-[13px] text-gray-600">
        角色
        <HubSelect
          v-model="form.role"
          :options="ROLE_OPTIONS"
          trigger-class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
          item-class="text-sm text-gray-700"
          aria-label="新用户角色"
          title="新用户角色"
        />
      </Label>
      <button
        type="submit"
        :disabled="creating || !form.username.trim() || !form.password"
        class="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {{ creating ? '创建中…' : '创建用户' }}
      </button>
    </form>

    <p v-if="notice" class="mt-3 text-sm text-green-600">{{ notice }}</p>
    <p v-if="error" class="mt-3 text-sm text-red-500">{{ error }}</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500">加载中…</p>

    <table v-else class="mt-4 w-full border-collapse rounded border border-gray-200 bg-white text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="px-3 py-2 font-medium">ID</th>
          <th class="px-3 py-2 font-medium">用户名</th>
          <th class="px-3 py-2 font-medium">角色</th>
          <th class="px-3 py-2 font-medium">令牌</th>
          <th class="px-3 py-2 font-medium">创建时间</th>
          <th class="px-3 py-2 font-medium">操作</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="u in users" :key="u.id">
          <tr class="border-b border-gray-100">
            <td class="px-3 py-2 text-gray-500">{{ u.id }}</td>
            <td class="px-3 py-2 font-mono">{{ u.username }}</td>
            <td class="px-3 py-2">
              <HubSelect
                :model-value="u.role"
                :options="ROLE_OPTIONS"
                :disabled="busyId === u.id"
                trigger-class="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-55"
                item-class="text-sm text-gray-700"
                aria-label="用户角色"
                title="用户角色"
                @update:model-value="(role) => changeRole(u, role)"
              />
            </td>
            <td class="px-3 py-2 text-gray-500">{{ u.tokenCount }}</td>
            <td class="px-3 py-2 text-gray-500">{{ formatTime(u.createdAt) }}</td>
            <td class="px-3 py-2">
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="busyId === u.id"
                  class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-55"
                  @click="startReset(u)"
                >
                  重置密码
                </button>
                <button
                  type="button"
                  :disabled="busyId === u.id"
                  class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-55"
                  @click="deleteTarget = u"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="resetTarget === u.id" class="border-b border-gray-100 bg-gray-50">
            <td colspan="6" class="px-3 py-2">
              <form class="flex items-center gap-2" @submit.prevent="submitReset(u)">
                <span class="text-[13px] text-gray-600">为 {{ u.username }} 设置新密码</span>
                <input
                  v-model="resetPassword"
                  type="password"
                  autocomplete="new-password"
                  class="rounded border border-gray-300 px-3 py-1 text-sm text-gray-900"
                />
                <button
                  type="submit"
                  :disabled="busyId === u.id"
                  class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-55"
                >
                  保存
                </button>
                <button
                  type="button"
                  class="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-white"
                  @click="resetTarget = null"
                >
                  取消
                </button>
              </form>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <p v-if="!loading && users.length === 0" class="mt-3 text-sm text-gray-500">暂无用户。</p>

    <!-- 删除用户：原 window.confirm 的文案与语义（令牌与会话一并删除）搬进 AlertDialog -->
    <AlertDialogRoot :open="deleteTarget !== null" @update:open="(open) => { if (!open) deleteTarget = null }">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-40 bg-black/30" />
        <AlertDialogContent
          class="fixed left-1/2 top-1/2 z-50 w-[24rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-4 shadow-xl"
        >
          <AlertDialogTitle class="text-sm font-bold text-gray-800">
            删除用户 {{ deleteTarget?.username }}
          </AlertDialogTitle>
          <AlertDialogDescription class="mt-1 text-xs text-gray-500">
            其令牌与会话将一并删除，且不可恢复。
          </AlertDialogDescription>

          <p v-if="error" class="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {{ error }}
          </p>

          <div class="mt-4 flex justify-end gap-2">
            <AlertDialogCancel
              class="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              取消
            </AlertDialogCancel>
            <button
              type="button"
              :disabled="busyId === deleteTarget?.id"
              class="rounded border border-red-400 bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              @click="deleteTarget && remove(deleteTarget)"
            >
              删除
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </section>
</template>
