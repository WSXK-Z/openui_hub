<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useSiteTheme } from './theme'

const route = useRoute()
const { theme, toggleTheme } = useSiteTheme()

const links = [
    { label: '组件文档', to: '/docs/button', prefix: '/docs' },
]

const activePrefix = computed(() => {
    const path = route.path
    if (path === '/') return '/'
    const match = links.find((link) => path.startsWith(link.prefix))
    return match?.prefix ?? ''
})

const isDark = computed(() => theme.value === 'dark')
</script>

<template>
    <header
        class="pg-header sticky top-0 z-50 border-b border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)]">
        <div class="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
            <RouterLink to="/docs/button" class="flex shrink-0 items-center gap-2 no-underline" aria-label="dp_ui 组件文档">
                <span
                    class="flex h-7 w-7 items-center justify-center rounded-[var(--dp-radius-sm,6px)] text-[13px] font-semibold text-[var(--dp-color-accent-fg,#fff)]"
                    style="background: var(--dp-color-accent, #3364f0)">dp</span>
                <span class="text-[15px] font-semibold text-[var(--dp-color-fg,#1b1e26)]">dp_ui</span>
                <span class="hidden text-xs text-[var(--dp-color-fg-2,#3b404d)] md:inline">Core 组件文档</span>
            </RouterLink>

            <nav class="pg-header__nav flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto" aria-label="主导航">
                <RouterLink v-for="link in links" :key="link.to" :to="link.to"
                    class="pg-header__link shrink-0 rounded-[var(--dp-radius-sm,6px)] px-2.5 py-1 text-[13px] no-underline"
                    :class="activePrefix === link.prefix
                        ? 'bg-[var(--dp-color-accent-soft,#eef2ff)] font-medium text-[var(--dp-color-accent,#3364f0)]'
                        : 'text-[var(--dp-color-fg-2,#3b404d)] hover:bg-[var(--dp-color-surface-2,#f4f5f7)] hover:text-[var(--dp-color-fg,#1b1e26)]'">
                    {{ link.label }}
                </RouterLink>
            </nav>

            <div class="flex shrink-0 items-center gap-1">
                <button type="button" class="pg-header__icon" :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
                    @click="toggleTheme">
                    <svg v-if="isDark" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                        stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                        stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
                    </svg>
                </button>
            </div>
        </div>
    </header>
</template>

<style scoped>
.pg-header__nav {
    scrollbar-width: none;
}

.pg-header__nav::-webkit-scrollbar {
    display: none;
}

.pg-header__link {
    transition: background 140ms ease, color 140ms ease;
}

.pg-header__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: var(--dp-radius-sm, 6px);
    background: transparent;
    color: var(--dp-color-fg-2, #3b404d);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
}

.pg-header__icon:hover {
    background: var(--dp-color-surface-2, #f4f5f7);
    color: var(--dp-color-fg, #1b1e26);
}

.pg-header__icon:focus-visible {
    outline: none;
    box-shadow: var(--dp-shadow-focus, 0 0 0 3px color-mix(in oklch, var(--dp-color-accent, #3364f0) 22%, transparent));
}
</style>
