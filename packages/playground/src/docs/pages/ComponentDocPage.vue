<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { DpButton, DpEmpty } from '@dp_ui/core'
import DemoCard from '../components/DemoCard.vue'
import DemoGrid from '../components/DemoGrid.vue'
import DocAnchor from '../components/DocAnchor.vue'
import DocApiTable from '../components/DocApiTable.vue'
import { getDocNeighbors, findComponentDoc } from '../registry'

const route = useRoute()

const doc = computed(() => findComponentDoc(String(route.params.name ?? '')))
const neighbors = computed(() => getDocNeighbors(String(route.params.name ?? '')))

const anchorItems = computed(() => {
    if (!doc.value) return []
    const items = doc.value.demos.map((demo) => ({
        id: demo.id,
        label: demo.title,
    }))
    if (doc.value.api?.length) items.push({ id: 'api', label: 'API' })
    return items
})

watchEffect(() => {
    document.title = doc.value
        ? `${doc.value.name} ${doc.value.zh} · dp_ui`
        : '组件文档 · dp_ui'
})
</script>

<template>
    <div v-if="doc" class="mx-auto flex w-full max-w-[1200px] gap-10 px-5 py-8 sm:px-8">
        <div class="min-w-0 flex-1">
            <header>
                <div class="mb-1 flex items-center gap-2 text-xs text-[var(--dp-color-fg-2,#3b404d)]">
                    <RouterLink to="/docs/button" class="no-underline hover:text-[var(--dp-color-accent,#3364f0)]">
                        组件文档
                    </RouterLink>
                    <span>/</span>
                    <span>{{ doc.group }}</span>
                </div>
                <h1 class="m-0 text-[26px] font-semibold leading-9 text-[var(--dp-color-fg,#1b1e26)]">
                    {{ doc.name }}
                    <span class="ml-2 text-lg font-normal text-[var(--dp-color-fg-2,#3b404d)]">{{ doc.zh }}</span>
                </h1>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-[var(--dp-color-fg,#1b1e26)]">{{ doc.desc }}</p>
            </header>

            <DemoGrid class="mt-8">
                <DemoCard v-for="demo in doc.demos" :id="demo.id" :key="demo.id" :title="demo.title"
                    :desc="demo.desc" :source="demo.source">
                    <component :is="demo.component" />
                </DemoCard>
            </DemoGrid>

            <section v-if="doc.api?.length" id="api" class="mt-12 scroll-mt-24">
                <h2 class="m-0 text-xl font-semibold text-[var(--dp-color-fg,#1b1e26)]">API</h2>
                <DocApiTable v-for="table in doc.api" :key="table.title" :title="table.title" :rows="table.rows" />
            </section>

            <nav class="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="相邻组件">
                <RouterLink v-if="neighbors.prev" :to="`/docs/${neighbors.prev.path}`"
                    class="group rounded-[var(--dp-radius-md,10px)] border border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)] p-4 no-underline transition-colors hover:border-[var(--dp-color-accent,#3364f0)]">
                    <div class="text-xs text-[var(--dp-color-fg-2,#3b404d)]">← 上一页</div>
                    <div
                        class="mt-1 text-sm font-medium text-[var(--dp-color-fg,#1b1e26)] group-hover:text-[var(--dp-color-accent,#3364f0)]">
                        {{ neighbors.prev.name }} {{ neighbors.prev.zh }}
                    </div>
                </RouterLink>
                <span v-else />
                <RouterLink v-if="neighbors.next" :to="`/docs/${neighbors.next.path}`"
                    class="group rounded-[var(--dp-radius-md,10px)] border border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)] p-4 text-right no-underline transition-colors hover:border-[var(--dp-color-accent,#3364f0)]">
                    <div class="text-xs text-[var(--dp-color-fg-2,#3b404d)]">下一页 →</div>
                    <div
                        class="mt-1 text-sm font-medium text-[var(--dp-color-fg,#1b1e26)] group-hover:text-[var(--dp-color-accent,#3364f0)]">
                        {{ neighbors.next.name }} {{ neighbors.next.zh }}
                    </div>
                </RouterLink>
            </nav>
        </div>

        <DocAnchor :items="anchorItems" />
    </div>

    <div v-else class="mx-auto w-full max-w-[720px] px-6 py-20">
        <DpEmpty :comp="{ description: '该组件文档还在建设中' }" />
        <div class="mt-6 flex justify-center gap-3">
            <RouterLink to="/docs/button" class="no-underline">
                <DpButton :theme="{ variant: 'primary' }">查看 Button 文档</DpButton>
            </RouterLink>
            <RouterLink to="/components" class="no-underline">
                <DpButton :theme="{ ghost: true }">组件大全</DpButton>
            </RouterLink>
        </div>
    </div>
</template>
