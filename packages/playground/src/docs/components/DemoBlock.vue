<script setup lang="ts">
import { ref } from 'vue'
import { DpButton } from '@dp_ui/core'

defineProps<{
    /** 锚点 id（供右侧目录跳转） */
    id: string
    /** 示例标题 */
    title: string
    /** 示例说明 */
    desc?: string
    /** 展开后展示的示例源码（原样文本） */
    source: string
}>()

const showCode = ref(false)
</script>

<template>
    <section :id="id" class="scroll-mt-16">
        <header class="mb-2 flex items-start justify-between gap-4">
            <div>
                <h3 class="text-[15px] font-medium text-[var(--dp-color-text,#1f2937)]">{{ title }}</h3>
                <p v-if="desc" class="mt-1 text-sm leading-6 text-[var(--dp-color-text-secondary,#6b7280)]">{{ desc }}
                </p>
            </div>
            <DpButton
                :theme="{ variant: 'default', size: 'small', ghost: true, cssVars: { '--dp-size-btn-h-sm': '26px' } }"
                :aria-label="showCode ? '收起代码' : '展开代码'" @click="showCode = !showCode">
                <span class="text-xs">{{ showCode ? '收起代码' : '查看代码' }}</span>
            </DpButton>
        </header>

        <div
            class="overflow-hidden rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white">
            <div class="example flex min-h-[64px] flex-wrap items-center gap-3 px-6 py-5">
                <slot />
            </div>
            <pre v-if="showCode"
                class="doc-code m-0 overflow-x-auto border-t border-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_50%,transparent)] bg-[#1e1e1e] p-4 font-mono text-[13px] leading-6 text-[#d4d4d4]"><code>{{ source }}</code></pre>
        </div>
    </section>
</template>
