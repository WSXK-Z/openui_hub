<script setup lang="ts">
import type { DemoApiRow } from '../registry'

defineProps<{
    title: string
    rows: DemoApiRow[]
}>()
</script>

<template>
    <section class="mt-8">
        <h3 class="m-0 mb-2 text-[15px] font-medium text-[var(--dp-color-fg,#1b1e26)]">{{ title }}</h3>
        <div
            class="overflow-x-auto rounded-[var(--dp-radius-md,10px)] border border-[var(--dp-color-border,#e4e6eb)] bg-[var(--dp-color-surface,#fff)]">
            <table class="w-full border-collapse text-left text-[13px]">
                <thead>
                    <tr class="bg-[var(--dp-color-surface-2,#f4f5f7)] text-[var(--dp-color-fg,#1b1e26)]">
                        <th class="w-40 px-4 py-2 font-medium">名称</th>
                        <th class="px-4 py-2 font-medium">类型</th>
                        <th class="w-28 px-4 py-2 font-medium">默认值</th>
                        <th class="px-4 py-2 font-medium">说明</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in rows" :key="row.name"
                        class="border-t border-[var(--dp-color-border,#e4e6eb)] align-top text-[var(--dp-color-fg,#1b1e26)]">
                        <td class="px-4 py-2 font-mono text-[12.5px] text-[var(--dp-color-accent,#3364f0)]">
                            {{ row.name }}
                        </td>
                        <td class="px-4 py-2 font-mono text-xs leading-5 text-[var(--dp-color-fg-2,#3b404d)]">
                            {{ row.type }}
                        </td>
                        <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-fg-2,#3b404d)]">
                            {{ row.def ?? '—' }}
                        </td>
                        <td class="px-4 py-2 text-xs leading-5 text-[var(--dp-color-fg-2,#3b404d)]">
                            {{ row.desc }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
</template>
