<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'

defineOptions({ name: 'DpLazy', inheritAttrs: false })

export interface DpLazyComp {
    /** 进入视口前的预加载距离 */
    rootMargin: string
    /** 进入视口后再延迟多少 ms 渲染 */
    delay: number
}

export type DpLazyProps = DpProps<DpLazyComp>

const props = defineProps<DpLazyProps>()

const { comp: c, rootAttrs } = useDpProps<DpLazyComp>(props, {
    compDefaults: { rootMargin: '100px', delay: 0 },
})

const rootRef = ref<HTMLElement | null>(null)
const shown = ref(false)

let observer: IntersectionObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null

function reveal() {
    if (c.value.delay > 0) {
        timer = setTimeout(() => {
            shown.value = true
        }, c.value.delay)
    } else {
        shown.value = true
    }
}

onMounted(() => {
    if (!('IntersectionObserver' in window)) {
        shown.value = true
        return
    }
    observer = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                reveal()
                observer?.disconnect()
            }
        },
        { rootMargin: c.value.rootMargin },
    )
    if (rootRef.value) observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    if (timer) clearTimeout(timer)
})
</script>

<template>
    <span ref="rootRef" v-bind="rootAttrs" class="dp-lazy contents">
        <template v-if="shown">
            <slot />
        </template>
    </span>
</template>
