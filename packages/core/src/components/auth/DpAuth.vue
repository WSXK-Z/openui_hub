<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from './useAuth'
import { useDpProps } from '../../composables/useDpProps.ts'
import type { DpProps } from '../../types'

defineOptions({ name: 'DpAuth', inheritAttrs: false })

export interface DpAuthComp {
  /** 权限码，为空表示始终允许 */
  code: string
}

export type DpAuthProps = DpProps<DpAuthComp>

const props = defineProps<DpAuthProps>()

const { comp: c } = useDpProps<DpAuthComp>(props, {
  compDefaults: { code: '' },
})

const auth = useAuth()

const allowed = computed(() => c.value.code === '' || auth.has(c.value.code))
</script>

<template>
  <template v-if="allowed">
    <slot />
  </template>
  <template v-else>
    <slot name="fallback" />
  </template>
</template>
