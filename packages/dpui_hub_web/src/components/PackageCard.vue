<script setup lang="ts">
/**
 * 首页等高网格卡片：固定 200px 高（不随版本/加载/失败/复制反馈变化），
 * 远程组件预览 + 版本切换 + 右下角操作 + 管理员左下角入口。
 *
 * - 单击不跳转，双击卡片进详情（点击下拉/按钮不触发，靠 [data-no-nav] 守卫）；
 * - 卡片上不执行任何破坏性操作：删除/发布只跳详情页对应操作区。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { DpTag } from '@dp_ui/core'

import { cliAddCommand, remotePkgOf, type HubPackageItem, type HubVersionInfo } from '../api'
import { useAuth } from '../composables/useAuth'
import HubSelect from './HubSelect.vue'
import RemotePreview from './RemotePreview.vue'

const props = defineProps<{ item: HubPackageItem; versions: HubVersionInfo[] | null }>()

const router = useRouter()
const { isAdmin } = useAuth()

const displayName = computed(() => `${props.item.scope}/${props.item.name}`)
/** 路由约定：scope 段不带 @。 */
const pkgPath = computed(() => `/pkg/${props.item.scope.replace(/^@/, '')}/${props.item.name}`)

/** null = 版本清单尚未取回；[] = 取回但该包已无任何版本（或详情请求失败）。 */
const versionsReady = computed(() => props.versions !== null)
const list = computed(() => props.versions ?? [])
/** 无版本时不显示版本选择与预览区，只留一行降级提示。 */
const hasVersions = computed(() => list.value.length > 0)

/** 默认选中 latest；版本列表到齐后校正（index 的 latest 可能已下线）。 */
const selected = ref(props.item.latest ?? '')
watch(
  () => props.versions,
  (next) => {
    if (!next?.length) return
    if (selected.value && next.some((v) => v.version === selected.value)) return
    const latest = props.item.latest
    selected.value = latest && next.some((v) => v.version === latest) ? latest : next[next.length - 1]!.version
  },
  { immediate: true },
)

/** 版本选择器的选项（只取版本号，与原生 `<option>` 列表一致）。 */
const versionOptions = computed(() => list.value.map((v) => v.version))

const current = computed(() => list.value.find((v) => v.version === selected.value) ?? null)
/** 预览/复制的远程入口始终按当前所选版本推导，切换版本即整体切换。 */
const remotePkg = computed(() =>
  current.value ? remotePkgOf(props.item.scope, props.item.name, current.value.version, current.value.manifest) : null,
)
const isLatest = computed(() => selected.value !== '' && selected.value === props.item.latest)

interface Feedback {
  kind: 'cli' | 'url'
  ok: boolean
  message: string
}

const feedback = ref<Feedback | null>(null)
let feedbackTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(feedbackTimer))

function flash(kind: 'cli' | 'url', ok: boolean, message = '') {
  feedback.value = { kind, ok, message }
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    feedback.value = null
  }, 2500)
}

/** 剪贴板写入：优先异步 API，被拒（无权限/非安全上下文）时退回 execCommand。 */
async function writeClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // 落到兜底实现
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  if (!ok) throw new Error('浏览器拒绝了剪贴板写入')
}

async function copy(kind: 'cli' | 'url') {
  if (!selected.value) {
    flash(kind, false, '尚无可用版本')
    return
  }
  const text = kind === 'cli' ? cliAddCommand(props.item.scope, props.item.name, selected.value) : remotePkg.value?.moduleUrl
  if (!text) {
    flash(kind, false, '该版本 manifest 缺少 entry.module')
    return
  }
  try {
    await writeClipboard(text)
    flash(kind, true)
  } catch (e) {
    flash(kind, false, `复制失败：${e instanceof Error ? e.message : String(e)}`)
  }
}

function goDetail(action?: 'delete' | 'publish') {
  if (action && !isAdmin.value) return
  const query: Record<string, string> = {}
  if (selected.value) query.version = selected.value
  if (action) query.action = action
  void router.push({ path: pkgPath.value, query })
}

function onDblClick(event: MouseEvent) {
  if ((event.target as HTMLElement | null)?.closest('[data-no-nav]')) return
  goDetail()
}

const btn =
  'rounded border border-gray-300 bg-white px-0.5 py-0.5 text-[11px] leading-none text-gray-600 hover:border-gray-400 hover:text-gray-900'
const adminBtn =
  'rounded border border-red-200 bg-red-50 px-0.5 py-0.5 text-[11px] leading-none text-red-600 hover:bg-red-100'
</script>

<template>
  <!--
    高度固定为 200px（header 61 + 预览区 flex-1 + 复制反馈条 16 + footer 30），
    任何状态（加载/降级/失败/复制反馈）都只改变各分区内部内容，卡片 rect 恒定。
  -->
  <article
    class="flex h-[200px] flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow"
    :title="`双击进入 ${displayName} 详情`"
    @dblclick="onDblClick"
  >
    <header class="flex flex-none items-start gap-2 border-b border-gray-100 px-2.5 py-2">
      <div class="min-w-0 flex-1">
        <div class="flex h-6 min-w-0 items-center gap-2">
          <span class="min-w-0 truncate font-mono text-sm font-semibold text-gray-800">{{ displayName }}</span>
          <DpTag v-if="isLatest" type="info">latest</DpTag>
        </div>
        <p class="mt-1 h-4 truncate text-[11px] leading-4 text-gray-500">{{ item.description || '（无描述）' }}</p>
      </div>
      <!-- 固定宽度的版本槽：版本号长短 / 徽标有无都不改变 header 内其它元素的位置 -->
      <div class="flex h-6 w-[76px] shrink-0 items-center justify-end" data-no-nav>
        <HubSelect
          v-if="hasVersions"
          v-model="selected"
          :options="versionOptions"
          trigger-class="h-5 w-[72px] rounded border border-gray-300 bg-white px-1 font-mono text-[11px] leading-none text-gray-700 [font-variant-numeric:tabular-nums]"
          item-class="font-mono text-[11px] text-gray-700"
          aria-label="切换预览版本"
          title="切换预览版本"
        />
        <span
          v-else-if="item.latest"
          class="truncate font-mono text-[11px] text-gray-400 [font-variant-numeric:tabular-nums]"
        >{{ item.latest }}</span>
      </div>
    </header>

    <!--
      预览区：flex-1 固定占位。loading / ready / 渲染失败 / 无版本降级四种状态
      全部在这一个容器里渲染，不再用行高不同的独立元素替代整个预览区。
    -->
    <div
      class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-50"
    >
      <div class="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden px-3">
        <RemotePreview v-if="hasVersions" :pkg="remotePkg" :label="item.name" />
        <span v-else-if="versionsReady" class="text-[11px] text-gray-400">暂无可用版本</span>
        <span v-else class="text-[11px] text-gray-400">版本信息加载中…</span>
      </div>
      <span
        v-if="hasVersions"
        class="absolute left-2 top-2 rounded border border-gray-200 bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-400"
      >
        仅预览
      </span>
    </div>

    <footer class="flex flex-none items-center justify-between gap-0.5 border-t border-gray-100 px-1 py-1.5" data-no-nav>
      <div class="flex items-center gap-0.5">
        <template v-if="isAdmin">
          <button type="button" :class="adminBtn" title="到详情页删除该版本" @click="goDetail('delete')">删除</button>
          <button type="button" :class="adminBtn" title="到详情页发布新版本" @click="goDetail('publish')">发布</button>
        </template>
      </div>
      <div class="flex items-center gap-0.5">
        <button type="button" :class="btn" @click="goDetail()">详情</button>
        <button
          type="button"
          :class="btn"
          title="复制构建期 CLI 添加命令（pnpm add -D @dp_ui/hub_vite + dpui use …）"
          @click="copy('cli')"
        >
          {{ feedback?.kind === 'cli' && feedback.ok ? '已复制' : '复制 CLI' }}
        </button>
        <button type="button" :class="btn" title="复制该版本的远程组件 URL" @click="copy('url')">
          {{ feedback?.kind === 'url' && feedback.ok ? '已复制' : '复制 URL' }}
        </button>
      </div>
    </footer>

    <!--
      复制失败提示：常驻的固定高度（16px）条，出现/消失都不改变卡片高度；
      无错误时内容为空且不画边框，视觉上不存在。
    -->
    <p
      class="h-4 flex-none truncate px-2.5 text-[10px] leading-4"
      :class="feedback && !feedback.ok ? 'border-t border-red-100 bg-red-50 text-red-600' : ''"
      :title="feedback && !feedback.ok ? feedback.message : ''"
    >
      {{ feedback && !feedback.ok ? feedback.message : '' }}
    </p>
  </article>
</template>
