<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

import {
  ApiError,
  deletePackage,
  deletePackageVersion,
  fetchPackage,
  fetchPackageFiles,
  HUB_URL,
  packageFileUrl,
  packageManifestUrl,
  publishPackage,
  resolvePackage,
  type HubPackageDetail,
  type HubPackageFile,
  type HubResolve,
} from '../api'
import HubCheckbox from '../components/HubCheckbox.vue'
import HubSelect from '../components/HubSelect.vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps<{ scope: string; name: string }>()

const route = useRoute()
const router = useRouter()
/** 管理操作仅 admin 可见；未登录/非 admin 完全看不到入口。 */
const { isAdmin } = useAuth()

const fullName = computed(() => `@${props.scope}/${props.name}`)
const detail = ref<HubPackageDetail | null>(null)
const resolveInfo = ref<HubResolve | null>(null)
const error = ref('')

const installText = computed(() => {
  const n = fullName.value
  const lines = [
    `# CLI 锁定（生成 oui.lock.json）`,
    `oui use ${n}`,
    ``,
    `# 构建期（Vite 插件）`,
    `pnpm add @openui_hub/plugin_vite`,
    `// vite.config.ts`,
    `import hubVite from '@openui_hub/plugin_vite'`,
    `export default defineConfig({ plugins: [vue(), hubVite()] })`,
    `// 代码`,
    `import { Button } from 'oui-hub:${n}'`,
    ``,
    `# 运行期（HubRemote）`,
    `<HubRemote :pkg="'${resolveInfo.value?.moduleUrl ?? ''}'" />`,
  ]
  return lines.join('\n')
})

/* ------------------------------------------------------------------ *
 * 包资源：manifest.json 固定行 + files.json 清单 + 内容预览
 * ------------------------------------------------------------------ */

const MANIFEST_PATH = 'manifest.json'
/** 超过此大小不再自动加载预览（bytes）。 */
const PREVIEW_MAX_BYTES = 262144
/** 可当文本预览的扩展名（按首个点之后或最后一段后缀匹配）。 */
const TEXT_EXTS = new Set([
  'js', 'mjs', 'cjs',
  'ts', 'mts', 'cts',
  'd.ts', 'd.mts', 'd.cts',
  'vue', 'css', 'json', 'map', 'html', 'md', 'txt', 'svg',
])

const selectedVersion = ref('')
const files = ref<HubPackageFile[]>([])
const filesLoading = ref(false)
const filesError = ref('')

interface FileEntry {
  path: string
  /** manifest.json 无 files.json 条目，size/sha256 为 null。 */
  size: number | null
  sha256: string | null
  url: string
}

type PreviewKind = 'loading' | 'text' | 'error' | 'too-large' | 'binary'

interface Preview {
  entry: FileEntry
  kind: PreviewKind
  content: string
  message: string
}

const preview = ref<Preview | null>(null)

/** 请求序号：快速切换版本/文件时丢弃过期响应。 */
let filesSeq = 0
let previewSeq = 0

const manifestEntry = computed<FileEntry>(() => ({
  path: MANIFEST_PATH,
  size: null,
  sha256: null,
  url: packageManifestUrl(props.scope, props.name, selectedVersion.value),
}))

function entryOf(file: HubPackageFile): FileEntry {
  return {
    path: file.path,
    size: file.size,
    sha256: file.sha256,
    url: packageFileUrl(props.scope, props.name, selectedVersion.value, file.path),
  }
}

/** 按顶层目录分组；dist/、types/、source/ 优先，其余目录字典序，根级文件最后。 */
const groups = computed(() => {
  const byDir = new Map<string, HubPackageFile[]>()
  for (const file of files.value) {
    const slash = file.path.indexOf('/')
    const dir = slash === -1 ? '' : file.path.slice(0, slash + 1)
    const list = byDir.get(dir)
    if (list) list.push(file)
    else byDir.set(dir, [file])
  }
  const priority = ['dist/', 'types/', 'source/']
  const keys = [...byDir.keys()].sort((a, b) => {
    if (a === b) return 0
    if (a === '') return 1
    if (b === '') return -1
    const ai = priority.indexOf(a)
    const bi = priority.indexOf(b)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? priority.length : ai) - (bi === -1 ? priority.length : bi)
    return a.localeCompare(b)
  })
  return keys.map((key) => ({
    key: key || '__root__',
    label: key || '根级',
    files: byDir.get(key) ?? [],
  }))
})

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isTextPath(path: string): boolean {
  const name = baseName(path).toLowerCase()
  const firstDot = name.indexOf('.')
  if (firstDot === -1) return false
  const rest = name.slice(firstDot + 1)
  if (TEXT_EXTS.has(rest)) return true
  const lastDot = rest.lastIndexOf('.')
  return lastDot !== -1 && TEXT_EXTS.has(rest.slice(lastDot + 1))
}

function clearPreview() {
  previewSeq += 1
  preview.value = null
}

function isActivePath(path: string): boolean {
  return preview.value?.entry.path === path
}

async function openPreview(entry: FileEntry) {
  const seq = ++previewSeq
  const size = entry.size

  if (size !== null && size > PREVIEW_MAX_BYTES) {
    preview.value = { entry, kind: 'too-large', content: '', message: `文件较大（${formatSize(size)}），不在此预览` }
    return
  }
  if (size !== null && !isTextPath(entry.path)) {
    preview.value = { entry, kind: 'binary', content: '', message: `二进制文件（${formatSize(size)}）` }
    return
  }

  preview.value = { entry, kind: 'loading', content: '', message: '' }
  try {
    const res = await fetch(entry.url)
    if (seq !== previewSeq) return
    if (!res.ok) {
      preview.value = { entry, kind: 'error', content: '', message: `加载失败：HTTP ${res.status}` }
      return
    }
    const text = await res.text()
    if (seq !== previewSeq) return
    preview.value = { entry, kind: 'text', content: text, message: '' }
  } catch (e) {
    if (seq !== previewSeq) return
    const reason = e instanceof Error ? e.message : String(e)
    preview.value = { entry, kind: 'error', content: '', message: `加载失败：${reason}` }
  }
}

async function loadFiles() {
  const version = selectedVersion.value
  clearPreview()
  files.value = []
  filesError.value = ''
  if (!version) {
    filesLoading.value = false
    return
  }

  const seq = ++filesSeq
  filesLoading.value = true
  try {
    const result = await fetchPackageFiles(props.scope, props.name, version)
    if (seq !== filesSeq) return
    files.value = result.files
  } catch (e) {
    if (seq !== filesSeq) return
    filesError.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq === filesSeq) filesLoading.value = false
  }
}

watch(selectedVersion, () => {
  void loadFiles()
})

/** 重新拉详情（可指定保持选中的版本），供删除/发布成功后刷新。 */
async function refreshDetail(prefer?: string): Promise<void> {
  const next = await fetchPackage(props.scope, props.name)
  detail.value = next
  const wanted =
    prefer && next.versions.some((v) => v.version === prefer) ? prefer : (next.versions.at(-1)?.version ?? '')
  if (wanted === selectedVersion.value) await loadFiles()
  else selectedVersion.value = wanted
  resolveInfo.value = await resolvePackage(props.scope, props.name).catch(() => null)
}

async function load() {
  error.value = ''
  try {
    await refreshDetail()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
  applyRouteQuery()
}

/* ------------------------------------------------------------------ *
 * 管理操作（仅 admin；入口由卡片 ?version=&action= 跳转定位）
 * ------------------------------------------------------------------ */

type AdminAction = 'delete' | 'publish'

const adminMessage = ref('')
const adminError = ref('')
const deleting = ref(false)
const publishFile = ref<File | null>(null)
const publishing = ref(false)
/** 原生 file input：发布成功后清空其 value，否则再次选同一文件不会触发 change。 */
const fileInput = ref<HTMLInputElement | null>(null)
/** 删除确认：必须原样输入包名（整包删除还需勾选）才解锁按钮。 */
const confirmName = ref('')
const confirmWhole = ref(false)
/** 卡片带进来的 action，用于高亮对应操作区。 */
const focusedAction = ref<AdminAction | ''>('')
const deleteSection = ref<HTMLElement | null>(null)
const publishSection = ref<HTMLElement | null>(null)
/** 删除确认 / 发布两个弹层的开合（受控：`?action=` 深链进入时自动打开，成功后关闭）。 */
const deleteOpen = ref(false)
const publishOpen = ref(false)

const confirmNameOk = computed(() => confirmName.value.trim() === fullName.value)

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return `版本已存在（409）：${e.message}`
    if (e.status === 400) return `归档校验失败（400）：${e.message}`
    if (e.status === 403) return `无权限（403）：${e.message}`
    if (e.status === 404) return `目标不存在（404）：${e.message}`
    return `HTTP ${e.status}：${e.message}`
  }
  return e instanceof Error ? e.message : String(e)
}

/** 读取卡片入口带来的 ?version= / ?action=（直接打开链接或页内 query 变化都生效）。 */
function applyRouteQuery() {
  const { version, action } = route.query
  const wanted = typeof version === 'string' ? version : ''
  const act = action === 'delete' || action === 'publish' ? action : ''
  focusedAction.value = isAdmin.value ? act : ''
  if (wanted && detail.value?.versions.some((v) => v.version === wanted)) selectedVersion.value = wanted
  if (!focusedAction.value) return
  // 深链 ?action= 直接打开对应弹层，同时把操作区滚入视野（弹层关闭后仍能看到高亮区块）
  if (focusedAction.value === 'delete') deleteOpen.value = true
  else publishOpen.value = true
  void nextTick(() => {
    const target = focusedAction.value === 'delete' ? deleteSection.value : publishSection.value
    target?.scrollIntoView({ block: 'center' })
  })
}

async function removeVersion() {
  const version = selectedVersion.value
  if (!confirmNameOk.value || !version || deleting.value) return
  deleting.value = true
  adminError.value = ''
  adminMessage.value = ''
  try {
    const res = await deletePackageVersion(props.scope, props.name, version)
    confirmName.value = ''
    deleteOpen.value = false
    if ((detail.value?.versions.length ?? 1) <= 1) {
      // 最后一个版本被删：包已不存在，回首页提示（卡片随之消失）
      await router.push({ path: '/', query: { deleted: `${fullName.value}@${version}` } })
      return
    }
    await refreshDetail(res.latest ?? undefined)
    adminMessage.value = `已删除 ${fullName.value}@${version}`
  } catch (e) {
    adminError.value = errorText(e)
  } finally {
    deleting.value = false
  }
}

async function removePackage() {
  if (!confirmNameOk.value || !confirmWhole.value || deleting.value) return
  deleting.value = true
  adminError.value = ''
  adminMessage.value = ''
  try {
    await deletePackage(props.scope, props.name)
    deleteOpen.value = false
    await router.push({ path: '/', query: { deleted: fullName.value } })
  } catch (e) {
    adminError.value = errorText(e)
  } finally {
    deleting.value = false
  }
}

function onPickArchive(event: Event) {
  const input = event.target as HTMLInputElement
  publishFile.value = input.files?.[0] ?? null
  adminError.value = ''
  adminMessage.value = ''
}

async function publish() {
  const file = publishFile.value
  if (!file || publishing.value) return
  publishing.value = true
  adminError.value = ''
  adminMessage.value = ''
  try {
    const res = await publishPackage(file)
    adminMessage.value = `已发布 ${res.name}@${res.version}（201）`
    publishFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    publishOpen.value = false
    await refreshDetail(res.version)
  } catch (e) {
    adminError.value = errorText(e)
  } finally {
    publishing.value = false
  }
}

watch(() => route.query, applyRouteQuery)
watch(isAdmin, applyRouteQuery)
// 同一组件实例换包（/pkg/a/x → /pkg/b/y）时重新加载
watch(() => [props.scope, props.name], load)

onMounted(load)
</script>

<template>
  <section>
    <router-link to="/" class="text-sm text-blue-600">← 返回列表</router-link>

    <p v-if="error" class="mt-4 text-sm text-red-500">{{ error }}</p>
    <template v-else-if="detail">
      <div class="mt-2 flex items-baseline gap-3">
        <h1 class="font-mono text-xl font-bold">{{ fullName }}</h1>
        <span class="text-sm text-gray-500">hub: {{ HUB_URL }}</span>
      </div>

      <h2 class="mt-6 text-sm font-bold text-gray-700">版本</h2>
      <ul class="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
        <li v-if="detail.versions.length === 0" class="px-4 py-2 text-sm text-gray-400">暂无可用版本</li>
        <li v-for="v in detail.versions" :key="v.version" class="px-4 py-2 font-mono text-sm"
          :class="v.version === selectedVersion ? 'bg-blue-50' : ''">
          {{ v.version }}
        </li>
      </ul>

      <h2 class="mt-6 text-sm font-bold text-gray-700">包资源</h2>
      <div class="mt-2 flex items-center gap-3">
        <HubSelect v-model="selectedVersion" :options="detail.versions.map((v) => v.version)"
          trigger-class="rounded border border-gray-300 bg-white px-2 py-1 font-mono text-sm text-gray-900"
          item-class="font-mono text-xs text-gray-700" aria-label="选择包资源版本" title="选择包资源版本" />
        <span v-if="filesLoading" class="text-sm text-gray-500">加载中…</span>
        <span v-else-if="filesError" class="text-sm text-red-500">清单加载失败：{{ filesError }}</span>
      </div>

      <div v-if="selectedVersion && !filesLoading && !filesError" class="mt-2 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div class="overflow-hidden rounded border border-gray-200 bg-white">
          <ul class="divide-y divide-gray-100">
            <li>
              <button type="button"
                class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
                :class="isActivePath(MANIFEST_PATH) ? 'bg-blue-50' : ''" @click="openPreview(manifestEntry)">
                <span class="truncate font-mono text-xs">{{ MANIFEST_PATH }}</span>
                <span class="shrink-0 text-xs text-gray-400">—</span>
              </button>
            </li>
          </ul>
          <template v-for="g in groups" :key="g.key">
            <p class="border-t border-gray-200 bg-gray-50 px-3 py-1 font-mono text-xs text-gray-500">
              {{ g.label }}
            </p>
            <ul class="divide-y divide-gray-100">
              <li v-for="f in g.files" :key="f.path">
                <button type="button"
                  class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
                  :class="isActivePath(f.path) ? 'bg-blue-50' : ''" :title="f.path" @click="openPreview(entryOf(f))">
                  <span class="truncate font-mono text-xs">{{ baseName(f.path) }}</span>
                  <span class="shrink-0 text-xs text-gray-400">{{ formatSize(f.size) }}</span>
                </button>
              </li>
            </ul>
          </template>
        </div>

        <div class="min-w-0">
          <p v-if="!preview" class="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            选择左侧文件以预览内容。
          </p>
          <div v-else class="overflow-hidden rounded border border-gray-200 bg-gray-50">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-gray-200 bg-white px-3 py-2">
              <span class="font-mono text-xs font-bold">{{ preview.entry.path }}</span>
              <span class="text-xs text-gray-500">{{ formatSize(preview.entry.size) }}</span>
              <a :href="preview.entry.url" target="_blank" rel="noreferrer"
                class="text-xs text-blue-600 hover:text-blue-700">
                新窗口打开
              </a>
            </div>
            <p v-if="preview.entry.sha256"
              class="select-all border-b border-gray-200 bg-white px-3 py-1 font-mono text-[11px] text-gray-400">
              {{ preview.entry.sha256 }}
            </p>

            <p v-if="preview.kind === 'loading'" class="p-4 text-sm text-gray-500">加载中…</p>
            <p v-else-if="preview.kind === 'error'" class="p-4 text-sm text-red-500">{{ preview.message }}</p>
            <div v-else-if="preview.kind === 'too-large' || preview.kind === 'binary'"
              class="flex flex-wrap items-center gap-3 p-4 text-sm text-gray-600">
              <span>{{ preview.message }}</span>
              <a :href="preview.entry.url" target="_blank" rel="noreferrer" class="text-blue-600 hover:text-blue-700">
                新窗口打开
              </a>
            </div>
            <pre v-else class="max-h-[480px] overflow-auto p-4 font-mono text-xs">{{ preview.content }}</pre>
          </div>
        </div>
      </div>

      <h2 class="mt-6 text-sm font-bold text-gray-700">安装</h2>
      <pre class="mt-2 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-4 text-xs">{{ installText }}</pre>

      <section v-if="isAdmin" class="mt-8">
        <div class="flex items-baseline gap-2">
          <h2 class="text-sm font-bold text-red-700">管理操作</h2>
          <span class="text-xs text-gray-500">仅管理员可见；破坏性操作立即生效且不可撤销</span>
        </div>

        <p v-if="adminMessage"
          class="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {{ adminMessage }}
        </p>
        <p v-if="adminError" class="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ adminError }}
        </p>

        <div ref="deleteSection" class="mt-3 rounded border p-3"
          :class="focusedAction === 'delete' ? 'border-red-400 bg-white ring-2 ring-red-100' : 'border-gray-200 bg-white'">
          <h3 class="text-sm font-bold text-gray-800">删除</h3>
          <p class="mt-1 text-xs text-gray-500">
            确认弹层内需先原样输入完整包名
            <span class="font-mono">{{ fullName }}</span>
            才能提交删除该版本（防止误点）。
          </p>
          <p class="mt-2 font-mono text-xs text-gray-500">待删版本：{{ selectedVersion || '—' }}</p>
          <button type="button"
            class="mt-2 rounded border border-red-300 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
            @click="deleteOpen = true">
            打开删除确认…
          </button>
        </div>

        <AlertDialogRoot v-model:open="deleteOpen">
          <AlertDialogPortal>
            <AlertDialogOverlay class="fixed inset-0 z-40 bg-black/30" />
            <AlertDialogContent
              class="fixed left-1/2 top-1/2 z-50 w-[30rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-4 shadow-xl">
              <AlertDialogTitle class="text-sm font-bold text-gray-800">删除 {{ fullName }}</AlertDialogTitle>
              <AlertDialogDescription class="mt-1 text-xs text-gray-500">
                破坏性操作立即生效且不可撤销。先原样输入完整包名解锁按钮；删除整个包还需勾选确认。
              </AlertDialogDescription>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <input v-model="confirmName" type="text" :placeholder="fullName"
                  class="w-56 rounded border border-gray-300 px-2 py-1 font-mono text-xs" />
                <span class="font-mono text-xs text-gray-500">待删版本：{{ selectedVersion || '—' }}</span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <button type="button"
                  class="rounded border border-red-300 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="!confirmNameOk || !selectedVersion || deleting" @click="removeVersion">
                  删除该版本
                </button>
                <span v-if="deleting" class="text-xs text-gray-500">处理中…</span>
              </div>

              <label class="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <HubCheckbox v-model="confirmWhole" />
                确认删除整个包（全部 {{ detail.versions.length }} 个版本）
              </label>
              <button type="button"
                class="mt-2 rounded border border-red-400 bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!confirmNameOk || !confirmWhole || deleting" @click="removePackage">
                删除整个包
              </button>

              <p v-if="adminError" class="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {{ adminError }}
              </p>

              <div class="mt-4 flex justify-end">
                <AlertDialogCancel
                  class="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
                  取消
                </AlertDialogCancel>
              </div>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialogRoot>

        <div ref="publishSection" class="mt-3 rounded border p-3" :class="focusedAction === 'publish' ? 'border-blue-400 bg-white ring-2 ring-blue-100' : 'border-gray-200 bg-white'
          ">
          <h3 class="text-sm font-bold text-gray-800">发布新版本</h3>
          <p class="mt-1 text-xs text-gray-500">选择本地 .tgz / .tar.gz 归档（须含 manifest.json）上传。</p>
          <button type="button"
            class="mt-2 rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100"
            @click="publishOpen = true">
            发布新版本…
          </button>
        </div>

        <DialogRoot v-model:open="publishOpen">
          <DialogPortal>
            <DialogOverlay class="fixed inset-0 z-40 bg-black/30" />
            <DialogContent
              class="fixed left-1/2 top-1/2 z-50 w-[28rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-4 shadow-xl">
              <DialogTitle class="text-sm font-bold text-gray-800">发布新版本</DialogTitle>
              <DialogDescription class="mt-1 text-xs text-gray-500">
                选择本地 .tgz / .tar.gz 归档（须含 manifest.json）上传；同名版本已存在会被服务端拒绝。
              </DialogDescription>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <input ref="fileInput" type="file" accept=".tgz,.tar.gz,application/gzip" class="text-xs"
                  @change="onPickArchive" />
                <button type="button"
                  class="rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="!publishFile || publishing" @click="publish">
                  上传发布
                </button>
                <span v-if="publishing" class="text-xs text-gray-500">上传中…</span>
              </div>

              <p v-if="adminError" class="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {{ adminError }}
              </p>

              <div class="mt-4 flex justify-end">
                <DialogClose
                  class="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
                  关闭
                </DialogClose>
              </div>
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
      </section>
    </template>
  </section>
</template>
