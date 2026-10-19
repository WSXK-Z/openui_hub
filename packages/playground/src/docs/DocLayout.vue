<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import DocMenu from './components/DocMenu.vue'
import { docMenuItems } from './menu'

const route = useRoute()
const showMobileMenu = ref(false)

const activeLabel = computed(() => {
    const path = route.path.replace(/^\/docs\/?/, '')
    const item = docMenuItems.find((entry) => entry.path === path)
    return item ? `${item.name} ${item.zh}` : '组件文档'
})

watch(
    () => route.path,
    () => {
        showMobileMenu.value = false
    },
)
</script>

<template>
    <!-- Naive UI 式文档外壳：固定侧边组件目录 + 内容区 -->
    <div class="pg-doc mx-auto flex w-full max-w-[1440px] items-start">
        <aside
            class="pg-doc__sider sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)] lg:block">
            <DocMenu />
        </aside>

        <div class="min-w-0 flex-1">
            <div
                class="pg-doc__mobile-bar sticky top-14 z-30 flex items-center justify-between gap-3 border-b border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)] px-4 py-2 lg:hidden">
                <button type="button"
                    class="inline-flex items-center gap-1.5 rounded-[var(--dp-radius-sm,6px)] border border-[var(--dp-color-border,#e4e6eb)] bg-transparent px-2.5 py-1 text-[13px] text-[var(--dp-color-fg,#1b1e26)]"
                    :aria-expanded="showMobileMenu" aria-controls="pg-doc-mobile-menu"
                    @click="showMobileMenu = !showMobileMenu">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                        <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    组件导航
                </button>
                <span class="truncate text-[13px] text-[var(--dp-color-fg-2,#3b404d)]">{{ activeLabel }}</span>
            </div>

            <div v-if="showMobileMenu" id="pg-doc-mobile-menu"
                class="border-b border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)] lg:hidden">
                <DocMenu compact />
            </div>

            <main class="pg-doc__main min-w-0">
                <RouterView />
            </main>
        </div>
    </div>
</template>
