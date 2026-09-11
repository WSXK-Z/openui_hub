<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcBubbleLoading', inheritAttrs: false })

export interface DpcBubbleLoadingComp {
  /** 文字（如「思考中…」）；留空仅显示三点 */
  text: string
}

export type DpcBubbleLoadingProps = DpcProps<DpcBubbleLoadingComp>

const props = defineProps<DpcBubbleLoadingProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcBubbleLoadingComp>(props, {
  compDefaults: { text: '' },
})

const dots = computed(() => [0, 1, 2])
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-bubble-loading flex items-center gap-1.5 py-0.5">
    <span v-for="(dot, index) in dots" :key="index"
      class="dpc-bubble-loading__dot inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60" :style="{
        animation: 'dpc-typing-bounce 1.2s infinite ease-in-out',
        animationDelay: `-${index * 0.15}s`,
      }" aria-hidden="true" />
    <span v-if="c.text" class="ml-1 text-xs opacity-70">{{ c.text }}</span>
  </div>
</template>
