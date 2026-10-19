<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { DpButton, DpTooltip } from '@dp_ui/core'

const props = defineProps<{
    /** 锚点 id */
    id: string
    /** 示例标题 */
    title: string
    /** 示例说明 */
    desc?: string
    /** 示例源码 */
    source: string
}>()

const showCode = ref(false)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copyCode() {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(props.source)
        } else {
            const textarea = document.createElement('textarea')
            textarea.value = props.source
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
        }
        copied.value = true
        if (copyTimer) clearTimeout(copyTimer)
        copyTimer = setTimeout(() => {
            copied.value = false
        }, 1600)
    } catch {
        copied.value = false
    }
}

onBeforeUnmount(() => {
    if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
    <article :id="id"
        class="pg-demo-card scroll-mt-24 overflow-hidden rounded-[var(--dp-radius-lg)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface)]">
        <header class="flex items-start justify-between gap-4 px-5 pb-1 pt-4">
            <div class="min-w-0">
                <h3 class="m-0 text-[15px] font-medium leading-6 text-[var(--dp-color-fg)]">{{ title }}</h3>
                <p v-if="desc" class="m-0 mt-1 text-[13px] leading-6 text-[var(--dp-color-fg-2)]">{{ desc }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
                <DpTooltip :comp="{ content: copied ? '已复制' : '复制代码' }">
                    <DpButton :theme="{ icon: true, ghost: true, size: 'small' }" :aria-label="copied ? '已复制' : '复制代码'"
                        @click="copyCode">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                            stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="11" height="11" rx="2.5" />
                            <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14" />
                        </svg>
                    </DpButton>
                </DpTooltip>
                <DpTooltip :comp="{ content: showCode ? '收起代码' : '显示代码' }">
                    <DpButton :theme="{ icon: true, ghost: true, size: 'small' }"
                        :aria-label="showCode ? '收起代码' : '显示代码'" :aria-expanded="showCode"
                        @click="showCode = !showCode">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                            stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="m8.5 6.5-5 5.5 5 5.5M15.5 6.5l5 5.5-5 5.5" />
                        </svg>
                    </DpButton>
                </DpTooltip>
            </div>
        </header>

        <div class="pg-demo-card__body px-5 py-6">
            <slot />
        </div>

        <div v-if="showCode"
            class="pg-demo-card__code-wrap border-t border-[var(--dp-color-border)] bg-[var(--dp-color-surface-2)]">
            <pre class="pg-demo-card__code m-0 overflow-x-auto px-5 py-4">{{ source }}</pre>
        </div>
    </article>
</template>

<style scoped>
.pg-demo-card__code {
    font-family: var(--dp-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 12.5px;
    line-height: 1.75;
    color: var(--dp-color-fg);
    tab-size: 4;
}
</style>
