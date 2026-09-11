<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { fetchIndex, fetchPackage, type HubPackageItem, type HubVersionInfo } from '../api'
import PackageCard from '../components/PackageCard.vue'

const route = useRoute()
/** 详情页删除后跳回首页带来的结果提示（?deleted=<pkg[@version]>）。 */
const notice = computed(() => (typeof route.query.deleted === 'string' ? `已删除 ${route.query.deleted}` : ''))

const items = ref<HubPackageItem[]>([])
const loading = ref(true)
const error = ref('')
const q = ref('')
/** `@scope/name` → 版本列表：index 不含版本清单，逐包补拉详情以填充卡片右上角版本选择。 */
const versions = ref<Record<string, HubVersionInfo[]>>({})
/** 全部详情请求结束前传给卡片 null（显示加载占位），结束后没有条目即视为该包无可用版本。 */
const versionsReady = ref(false)

const filtered = computed(() => {
  const kw = q.value.trim().toLowerCase()
  if (!kw) return items.value
  return items.value.filter((p) => `${p.scope}/${p.name}`.toLowerCase().includes(kw))
})

function keyOf(p: HubPackageItem): string {
  return `${p.scope}/${p.name}`
}

async function loadVersions(list: HubPackageItem[]) {
  await Promise.all(
    list.map(async (p) => {
      try {
        const detail = await fetchPackage(p.scope, p.name)
        versions.value[keyOf(p)] = detail.versions
      } catch {
        // 单个包详情失败不影响其它卡片：卡片退化为只显示 index 的 latest
      }
    }),
  )
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = (await fetchIndex()).packages
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
  versionsReady.value = false
  await loadVersions(items.value)
  versionsReady.value = true
}

onMounted(load)
</script>

<template>
  <section>
    <div class="mb-4 flex items-end justify-between gap-4">
      <div>
        <!--
          显式固定 line-height：远程组件产物（dist/style.css）带的是**未作用域的** UnoCSS 输出，
          其中 .text-xs/.text-lg 会在预览加载后被注入并覆盖宿主同名工具类（同优先级、后到者胜），
          使本行的行高从 12px 变 16px —— 页头长高 1px，整个网格下移 1px。
          钉死后页头高度恒定，与预览是否已加载无关。
        -->
        <h1 class="text-lg font-bold leading-4">组件</h1>
        <p class="mt-0.5 text-xs leading-4 text-gray-500">卡片内为远程组件的真实渲染结果；双击卡片进入详情。</p>
      </div>
      <input
        v-model="q"
        type="search"
        placeholder="搜索 @scope/name"
        class="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm"
      />
    </div>

    <p v-if="notice" class="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {{ notice }}
    </p>

    <p v-if="loading" class="text-sm text-gray-500">加载中…</p>
    <p v-else-if="error" class="text-sm text-red-500">加载失败：{{ error }}</p>
    <p v-else-if="filtered.length === 0" class="text-sm text-gray-500">
      {{ items.length === 0 ? '仓库为空。发布第一个组件：oui publish --dir <pkg 目录>' : '没有匹配的组件。' }}
    </p>

    <!--
      等高网格（非瀑布流）：卡片高度固定（PackageCard 的 h-[200px]），
      因此不再需要 CSS 多列的列平衡 —— 版本切换/加载态不会让整列卡片跳动。
      preset-mini 的 `grid-cols-<num>` 实测可生成 `grid-template-columns:repeat(N,minmax(0,1fr))`。
    -->
    <div
      v-else
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <PackageCard
        v-for="p in filtered"
        :key="keyOf(p)"
        :item="p"
        :versions="versionsReady ? (versions[keyOf(p)] ?? []) : null"
      />
    </div>
  </section>
</template>
