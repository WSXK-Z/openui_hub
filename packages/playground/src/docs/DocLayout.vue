<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { docMenuGroups } from './menu'

const route = useRoute()
</script>

<template>
    <!-- Naive UI 式组件文档外壳：左侧组件分类目录 + 内容区 -->
    <div class="pg-doc flex min-h-[calc(100vh-41px)]">
        <aside
            class="pg-doc__sider shrink-0 overflow-y-auto border-r border-[var(--dp-color-border,#e5e7eb)] bg-white py-4"
            style="width: 208px">
            <div v-for="group in docMenuGroups" :key="group.label" class="px-3 pb-4">
                <div
                    class="pg-doc__group-label px-2 pb-1 text-xs font-medium text-[var(--dp-color-text-secondary,#6b7280)]">
                    {{ group.label }}
                </div>
                <div class="flex flex-col gap-0.5">
                    <RouterLink v-for="item in group.items" :key="item.path" :to="`/docs/${item.path}`"
                        class="pg-doc__item group flex items-center justify-between rounded-[var(--dp-radius-sm,4px)] px-2 py-1 text-[13px] leading-6 text-[var(--dp-color-text,#1f2937)] transition-colors hover:bg-[color-mix(in_srgb,var(--dp-color-primary,#3b82f6)_8%,transparent)]"
                        :class="{
                            'bg-[color-mix(in_srgb,var(--dp-color-primary,#3b82f6)_8%,transparent)] text-[var(--dp-color-primary,#3b82f6)]':
                                route.path === `/docs/${item.path}`,
                        }">
                        <span>{{ item.name }}</span>
                        <span v-if="!item.implemented"
                            class="rounded bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_50%,transparent)] px-1 text-[10px] leading-4 text-[var(--dp-color-text-secondary,#6b7280)]">
                            建设中
                        </span>
                    </RouterLink>
                </div>
            </div>
        </aside>

        <main class="pg-doc__main min-w-0 flex-1 overflow-x-hidden bg-[#fafafa]">
            <RouterView />
        </main>
    </div>
</template>
