<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { findDocItem, toDpName } from '../menu'

const route = useRoute()

const name = computed(() => (typeof route.params.name === 'string' ? route.params.name : 'button'))
const item = computed(() => findDocItem(name.value))
const display = computed(() => item.value?.name ?? name.value)
const zh = computed(() => item.value?.zh ?? '')
const dpName = computed(() => toDpName(name.value))
</script>

<template>
    <div class="mx-auto max-w-3xl px-8 py-10">
        <h1 class="text-2xl font-semibold text-[var(--dp-color-text,#1f2937)]">
            {{ display }}
            <span v-if="zh" class="ml-2 text-base font-normal text-[var(--dp-color-text-secondary,#6b7280)]">{{ zh
                }}</span>
        </h1>

        <div
            class="mt-6 rounded-[var(--dp-radius-md,8px)] border border-dashed border-[var(--dp-color-border,#e5e7eb)] bg-white p-10 text-center">
            <p class="text-base text-[var(--dp-color-text,#1f2937)]">「{{ dpName }}」的独立文档页建设中</p>
            <p class="mt-2 text-sm text-[var(--dp-color-text-secondary,#6b7280)]">
                当前示例以 Button 为样板。完整演示请到「组件大全」查看。
            </p>
            <div class="mt-6">
                <RouterLink to="/components"
                    class="inline-flex items-center rounded-[var(--dp-radius,6px)] bg-[var(--dp-color-primary,#3b82f6)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--dp-color-primary-hover,#2563eb)]">
                    前往组件大全
                </RouterLink>
            </div>
        </div>
    </div>
</template>
