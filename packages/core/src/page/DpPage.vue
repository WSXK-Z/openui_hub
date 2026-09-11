<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps } from '../types'
import { providePageContext } from './pageContext'

defineOptions({ name: 'DpPage', inheritAttrs: false })

export interface DpPageComp {
  title: string
}

export type DpPageProps = DpProps<DpPageComp>

const props = defineProps<DpPageProps>()

const { comp: c, rootAttrs } = useDpProps<DpPageComp>(props, {
  compDefaults: { title: '' },
})

const route = useRoute()

const title = computed(() => c.value.title || (route.meta.title as string | undefined) || '')

// DpPage 目前只做容器：提供页面级上下文（title / route meta），不负责布局
providePageContext({ title: title.value, meta: route.meta })
</script>

<template>
  <div v-bind="rootAttrs" class="dp-page">
    <slot />
  </div>
</template>
