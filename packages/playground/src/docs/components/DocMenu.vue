<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { DpTag } from '@dp_ui/core'
import { docMenuGroups } from '../menu'
import { hasComponentDoc } from '../registry'

defineProps<{
    /** 移动端下拉面板里使用更紧凑的间距 */
    compact?: boolean
}>()

const route = useRoute()
const activePath = computed(() => route.path.replace(/^\/docs\/?/, ''))
const navRef = ref<HTMLElement | null>(null)

// 路由切换后把当前组件滚动到侧边栏可视区域内
watch(
    activePath,
    async () => {
        await nextTick()
        const active = navRef.value?.querySelector('.router-link-active')
        active?.scrollIntoView({ block: 'nearest' })
    },
    { immediate: true },
)
</script>

<template>
    <nav ref="navRef" class="pg-doc-menu flex flex-col" :class="compact ? 'gap-3 px-3 py-3' : 'gap-5 px-3 py-5'">
        <section v-for="group in docMenuGroups" :key="group.label">
            <div
                class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--dp-color-fg-2,#3b404d)]">
                {{ group.label }}
            </div>
            <div class="flex flex-col gap-0.5">
                <RouterLink v-for="item in group.items" :key="item.path" :to="`/docs/${item.path}`"
                    class="pg-doc-menu__item flex items-center gap-2 rounded-[var(--dp-radius-sm,6px)] px-2 py-[5px] text-[13px] leading-5"
                    :class="activePath === item.path
                        ? 'bg-[var(--dp-color-accent-soft,#eef2ff)] font-medium text-[var(--dp-color-accent,#3364f0)]'
                        : 'text-[var(--dp-color-fg,#1b1e26)] hover:bg-[var(--dp-color-surface-2,#f4f5f7)]'">
                    <span class="truncate">{{ item.name }}</span>
                    <span class="ml-auto shrink-0 text-[11px]"
                        :class="activePath === item.path
                            ? 'text-[var(--dp-color-accent,#3364f0)]'
                            : 'text-[var(--dp-color-fg-2,#3b404d)]'">
                        {{ item.zh }}
                    </span>
                    <DpTag v-if="!hasComponentDoc(item.path)" :theme="{ size: 'small' }"
                        class="!px-1 !text-[10px] shrink-0">
                        WIP
                    </DpTag>
                </RouterLink>
            </div>
        </section>
    </nav>
</template>

<style scoped>
.pg-doc-menu__item {
    text-decoration: none;
    transition: background 140ms ease, color 140ms ease;
}
</style>
