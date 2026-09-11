<script setup lang="ts">
import { computed } from 'vue'
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpAvatar', inheritAttrs: false })

export interface DpAvatarComp {
    src: string
    alt: string
}

export type DpAvatarProps = DpProps<DpAvatarComp>

const props = defineProps<DpAvatarProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpAvatarComp>(props, {
    compDefaults: { src: '', alt: '' },
    themeDefaults: { round: true },
})

const sizeClass = computed(() =>
    s.value.size === 'small'
        ? 'h-8 w-8 text-xs'
        : s.value.size === 'large'
            ? 'h-12 w-12 text-base'
            : 'h-10 w-10 text-sm',
)

const initial = computed(() => (c.value.alt ? c.value.alt.charAt(0).toUpperCase() : ''))
</script>

<template>
    <!-- 基于 reka-ui Avatar：图片加载成功才渲染，否则展示 fallback（可避免破图） -->
    <AvatarRoot v-bind="rootAttrs"
        class="dp-avatar inline-flex shrink-0 items-center justify-center overflow-hidden bg-[color-mix(in_srgb,var(--dp-color-border)_50%,transparent)] font-medium text-[var(--dp-color-text-secondary)]"
        :class="[sizeClass, s.round && 'rounded-full']">
        <template v-if="c.src">
            <AvatarImage :src="c.src" :alt="c.alt" class="h-full w-full object-cover" />
            <AvatarFallback class="flex h-full w-full items-center justify-center">
                <slot>{{ initial }}</slot>
            </AvatarFallback>
        </template>
        <AvatarFallback v-else class="flex h-full w-full items-center justify-center">
            <slot>{{ initial }}</slot>
        </AvatarFallback>
    </AvatarRoot>
</template>
