<script setup lang="ts">
import { provide } from 'vue'
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'

defineOptions({ name: 'DpProvide', inheritAttrs: false })

export interface DpProvideComp {
  key: string
  value: unknown
}

export type DpProvideProps = DpProps<DpProvideComp>

const props = defineProps<DpProvideProps>()

const { comp: c } = useDpProps<DpProvideComp>(props, {
  compDefaults: { key: '' },
})

provide(c.value.key, c.value.value)
</script>

<template>
  <slot />
</template>
