<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
    items: Array<{ id: string; label: string }>
}>()

const activeId = ref(props.items[0]?.id ?? '')

function updateActive() {
    let current = props.items[0]?.id ?? ''
    for (const item of props.items) {
        const el = document.getElementById(item.id)
        if (el && el.getBoundingClientRect().top <= 128) current = item.id
    }
    activeId.value = current
}

onMounted(() => {
    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
})

onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateActive)
})

watch(
    () => props.items,
    () => updateActive(),
)
</script>

<template>
    <aside class="pg-doc-anchor sticky top-20 hidden w-44 shrink-0 self-start xl:block">
        <div class="text-xs font-medium text-[var(--dp-color-fg-2,#3b404d)]">本页目录</div>
        <ul class="mt-2 flex list-none flex-col gap-0.5 border-l border-[var(--dp-color-border,#e4e6eb)] p-0">
            <li v-for="item in items" :key="item.id" class="m-0">
                <a :href="`#${item.id}`"
                    class="block border-l-2 px-3 py-1 text-[13px] leading-5 transition-colors"
                    :class="activeId === item.id
                        ? 'border-[var(--dp-color-accent,#3364f0)] text-[var(--dp-color-accent,#3364f0)]'
                        : 'border-transparent text-[var(--dp-color-fg-2,#3b404d)] hover:text-[var(--dp-color-fg,#1b1e26)]'">
                    {{ item.label }}
                </a>
            </li>
        </ul>
    </aside>
</template>
