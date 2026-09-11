<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Label } from 'reka-ui'

import { fetchAuthStatus, login, setSession, setup } from '../api'

const route = useRoute()
const router = useRouter()

const checking = ref(true)
const checkFailed = ref(false)
/** 仓库未初始化时表单切换为「创建首个管理员」。 */
const needsSetup = ref(false)
const username = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

async function check() {
  checking.value = true
  checkFailed.value = false
  error.value = ''
  try {
    needsSetup.value = (await fetchAuthStatus()).needsSetup
  } catch (e) {
    checkFailed.value = true
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    checking.value = false
  }
}

async function submit() {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    const result = needsSetup.value
      ? await setup(username.value.trim(), password.value)
      : await login(username.value.trim(), password.value)
    setSession({ token: result.sessionToken, expiresAt: result.expiresAt, user: result.user })
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
    await router.push(target)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}

onMounted(check)
</script>

<template>
  <section class="mx-auto mt-10 max-w-sm">
    <h1 class="text-lg font-bold">{{ needsSetup ? '初始化管理员' : '登录 dpui_hub' }}</h1>

    <p v-if="checking" class="mt-4 text-sm text-gray-500">检查初始化状态…</p>

    <template v-else-if="checkFailed">
      <p class="mt-4 text-sm text-red-500">无法获取认证状态：{{ error }}</p>
      <button
        type="button"
        class="mt-3 rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        @click="check"
      >
        重试
      </button>
    </template>

    <form v-else class="mt-4 flex flex-col gap-3" @submit.prevent="submit">
      <p v-if="needsSetup" class="text-sm text-gray-500">
        仓库尚未初始化，请创建首个管理员账号。
      </p>

      <Label class="flex flex-col gap-1 text-[13px] text-gray-600">
        用户名
        <input
          v-model="username"
          type="text"
          autocomplete="username"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
        />
      </Label>

      <Label class="flex flex-col gap-1 text-[13px] text-gray-600">
        密码
        <input
          v-model="password"
          type="password"
          :autocomplete="needsSetup ? 'new-password' : 'current-password'"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
        />
      </Label>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <button
        type="submit"
        :disabled="submitting || !username.trim() || !password"
        class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {{ submitting ? '提交中…' : needsSetup ? '创建管理员并登录' : '登录' }}
      </button>
    </form>
  </section>
</template>
