<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'
import type { DpcLocaleMessages, DpcLocaleName } from './locales'
import { dpcLocaleMap } from './locales'
import { provideDpcLocale } from './localeContext'

defineOptions({ name: 'DpcLocale', inheritAttrs: false })

export interface DpcLocaleComp {
  locale: DpcLocaleName
  /** 语言包局部覆盖（与所选语言合并） */
  messages: Partial<DpcLocaleMessages>
}

export type DpcLocaleProps = DpcProps<DpcLocaleComp>

const props = defineProps<DpcLocaleProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcLocaleComp>(props, {
  compDefaults: { locale: 'zh-CN', messages: {} },
})

const messages = computed<DpcLocaleMessages>(() => ({
  ...(dpcLocaleMap[c.value.locale] ?? dpcLocaleMap['zh-CN']),
  ...c.value.messages,
}))

provideDpcLocale({ name: c.value.locale, messages: messages.value })
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-locale contents">
    <slot />
  </div>
</template>
