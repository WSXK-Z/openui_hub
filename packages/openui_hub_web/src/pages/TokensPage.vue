<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

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
  createToken,
  deleteToken,
  fetchTokens,
  formatTime,
  type CreateTokenResult,
  type HubToken,
} from '../api'
import HubCheckbox from '../components/HubCheckbox.vue'
import HubTag from '../components/HubTag.vue'

const tokens = ref<HubToken[]>([])
const loading = ref(true)
const error = ref('')
const notice = ref('')

const name = ref('')
const scopeInput = ref('')
const picked = reactive({ publish: true, scope: false, admin: false, read: false })
const creating = ref(false)

/** 创建成功后仅此一次展示明文，页面刷新即丢失。 */
const created = ref<CreateTokenResult | null>(null)
const copied = ref(false)

const busyId = ref<number | null>(null)
/** 待吊销令牌：非 null 时 AlertDialog 打开（受控，便于成功后关闭/失败时保持打开显示错误）。 */
const revokeTarget = ref<HubToken | null>(null)

const permissions = computed(() => {
  const list: string[] = []
  if (picked.publish) list.push('publish')
  const scope = scopeInput.value.trim().replace(/^@+/, '')
  if (picked.scope && scope) list.push(`publish:@${scope}`)
  if (picked.admin) list.push('admin')
  if (picked.read) list.push('read')
  return list
})

function report(e: unknown) {
  error.value = e instanceof Error ? e.message : String(e)
}

/** 重新拉取列表；`initial` 为 true 时同时驱动「加载中…」占位。 */
async function load(initial = false) {
  if (initial) loading.value = true
  try {
    tokens.value = await fetchTokens()
    error.value = ''
  } catch (e) {
    report(e)
  } finally {
    if (initial) loading.value = false
  }
}

async function create() {
  error.value = ''
  notice.value = ''
  if (!name.value.trim()) {
    error.value = '请填写令牌名称'
    return
  }
  if (picked.scope && !scopeInput.value.trim()) {
    error.value = '请填写 publish 权限的 scope'
    return
  }
  if (permissions.value.length === 0) {
    error.value = '至少选择一项权限'
    return
  }
  creating.value = true
  try {
    created.value = await createToken({ name: name.value.trim(), permissions: permissions.value })
    copied.value = false
    name.value = ''
    scopeInput.value = ''
    picked.publish = true
    picked.scope = false
    picked.admin = false
    picked.read = false
    await load()
    notice.value = '令牌已生成，请立即复制明文（仅显示这一次）'
  } catch (e) {
    report(e)
  } finally {
    creating.value = false
  }
}

async function copyToken() {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(created.value.token)
    copied.value = true
  } catch {
    error.value = '复制失败，请手动选中文本复制'
  }
}

async function revoke(token: HubToken) {
  busyId.value = token.id
  error.value = ''
  notice.value = ''
  try {
    await deleteToken(token.id)
    revokeTarget.value = null
    await load()
    notice.value = `已吊销令牌 ${token.name}`
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
    <h1 class="text-lg font-bold">令牌</h1>

    <form
      class="mt-4 flex flex-col gap-3 rounded border border-gray-200 bg-white p-4"
      @submit.prevent="create"
    >
      <Label class="flex flex-col gap-1 text-[13px] text-gray-600">
        名称
        <input
          v-model="name"
          type="text"
          placeholder="例如 ci-publish"
          class="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
        />
      </Label>

      <fieldset class="flex flex-col gap-2 text-[13px] text-gray-600">
        <legend>权限</legend>
        <Label class="flex items-center gap-2">
          <HubCheckbox v-model="picked.publish" aria-label="publish 权限" />
          <span class="font-mono text-xs">publish</span>
          <span class="text-gray-400">可发布任意 scope</span>
        </Label>
        <Label class="flex items-center gap-2">
          <HubCheckbox v-model="picked.scope" aria-label="publish:&lt;scope&gt; 权限" />
          <span class="font-mono text-xs">publish:&lt;scope&gt;</span>
          <input
            v-model="scopeInput"
            type="text"
            placeholder="@scope"
            :disabled="!picked.scope"
            class="w-40 rounded border border-gray-300 px-2 py-1 font-mono text-xs text-gray-900 disabled:opacity-55"
          />
          <span class="text-gray-400">仅可发布该 scope</span>
        </Label>
        <Label class="flex items-center gap-2">
          <HubCheckbox v-model="picked.admin" aria-label="admin 权限" />
          <span class="font-mono text-xs">admin</span>
          <span class="text-gray-400">可管理用户与令牌，并视为拥有全部 publish 权限</span>
        </Label>
        <Label class="flex items-center gap-2">
          <HubCheckbox v-model="picked.read" aria-label="read 权限" />
          <span class="font-mono text-xs">read</span>
          <span class="text-gray-400">读接口本就公开，此项为语义占位</span>
        </Label>
      </fieldset>

      <p class="text-xs text-gray-500">
        将创建权限：<span class="font-mono">{{ permissions.join(', ') || '（无）' }}</span>
      </p>

      <div>
        <button
          type="submit"
          :disabled="creating"
          class="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {{ creating ? '生成中…' : '生成令牌' }}
        </button>
      </div>
    </form>

    <div v-if="created" class="mt-4 rounded border border-amber-200 bg-amber-50 p-4">
      <p class="text-sm text-amber-700">明文令牌仅显示这一次，关闭后无法再次查看：</p>
      <div class="mt-2 flex items-center gap-2">
        <code class="flex-1 overflow-x-auto rounded border border-amber-200 bg-white px-3 py-2 font-mono text-xs">{{ created.token }}</code>
        <button
          type="button"
          class="rounded border border-amber-300 bg-white px-3 py-1.5 text-xs hover:bg-amber-100"
          @click="copyToken"
        >
          {{ copied ? '已复制' : '复制' }}
        </button>
        <button
          type="button"
          class="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          @click="created = null"
        >
          关闭
        </button>
      </div>
      <p class="mt-2 text-xs text-amber-700">
        {{ created.name }} · {{ created.permissions.join(', ') }}
      </p>
    </div>

    <p v-if="notice" class="mt-3 text-sm text-green-600">{{ notice }}</p>
    <p v-if="error" class="mt-3 text-sm text-red-500">{{ error }}</p>

    <p v-if="loading" class="mt-4 text-sm text-gray-500">加载中…</p>

    <table v-else class="mt-4 w-full border-collapse rounded border border-gray-200 bg-white text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500">
          <th class="px-3 py-2 font-medium">ID</th>
          <th class="px-3 py-2 font-medium">名称</th>
          <th class="px-3 py-2 font-medium">权限</th>
          <th class="px-3 py-2 font-medium">用户</th>
          <th class="px-3 py-2 font-medium">创建时间</th>
          <th class="px-3 py-2 font-medium">最近使用</th>
          <th class="px-3 py-2 font-medium">状态</th>
          <th class="px-3 py-2 font-medium">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tokens" :key="t.id" class="border-b border-gray-100">
          <td class="px-3 py-2 text-gray-500">{{ t.id }}</td>
          <td class="px-3 py-2 font-mono">{{ t.name }}</td>
          <td class="px-3 py-2">
            <div class="flex flex-wrap gap-1">
              <HubTag v-for="p in t.permissions" :key="p" type="info">{{ p }}</HubTag>
            </div>
          </td>
          <td class="px-3 py-2">{{ t.username }}</td>
          <td class="px-3 py-2 text-gray-500">{{ formatTime(t.createdAt) }}</td>
          <td class="px-3 py-2 text-gray-500">{{ formatTime(t.lastUsedAt) }}</td>
          <td class="px-3 py-2">
            <HubTag v-if="t.revokedAt" type="danger">已吊销</HubTag>
            <HubTag v-else type="success">有效</HubTag>
          </td>
          <td class="px-3 py-2">
            <button
              type="button"
              :disabled="!!t.revokedAt || busyId === t.id"
              class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
              @click="revokeTarget = t"
            >
              吊销
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && tokens.length === 0" class="mt-3 text-sm text-gray-500">暂无令牌。</p>

    <!-- 吊销令牌：原 window.confirm 的文案与语义（使用该令牌的发布立即失败且不可恢复）搬进 AlertDialog -->
    <AlertDialogRoot :open="revokeTarget !== null" @update:open="(open) => { if (!open) revokeTarget = null }">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-40 bg-black/30" />
        <AlertDialogContent
          class="fixed left-1/2 top-1/2 z-50 w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-4 shadow-xl"
        >
          <AlertDialogTitle class="text-sm font-bold text-gray-800">
            吊销令牌 {{ revokeTarget?.name }}
          </AlertDialogTitle>
          <AlertDialogDescription class="mt-1 text-xs text-gray-500">
            使用该令牌的发布将立即失败，且不可恢复。
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
              :disabled="busyId === revokeTarget?.id"
              class="rounded border border-red-400 bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              @click="revokeTarget && revoke(revokeTarget)"
            >
              吊销
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </section>
</template>
