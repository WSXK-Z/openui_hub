<script setup lang="ts">
import { computed } from 'vue'
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpThemeProps } from '../../../types'

defineOptions({ name: 'DpAvatar', inheritAttrs: false })

export interface DpAvatarComp {
    src: string
    alt: string
}

/** 头像外观扩展：背景色与图片裁切方式 */
export interface DpAvatarTheme extends DpThemeProps {
    /** 头像背景色（覆盖默认 surface-3） */
    color?: string
    /** 图片填充方式，默认 cover */
    objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
}

export type DpAvatarProps = {
    theme?: DpAvatarTheme
    comp?: Partial<DpAvatarComp>
}

const props = defineProps<DpAvatarProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpAvatarComp>(props, {
    compDefaults: { src: '', alt: '' },
    themeDefaults: { round: true },
})

const t = computed(() => props.theme ?? {})

const colorStyle = computed(() => (t.value.color ? { backgroundColor: t.value.color } : undefined))
const imageStyle = computed(() => (t.value.objectFit ? { objectFit: t.value.objectFit } : undefined))

const mergedRootAttrs = computed(() => ({
    ...rootAttrs.value,
    style: [rootAttrs.value.style, colorStyle.value],
}))

const sizeClass = computed(() =>
    s.value.size === 'small'
        ? 'h-8 w-8 text-xs'
        : s.value.size === 'large'
            ? 'h-12 w-12 text-base'
            : 'h-[34px] w-[34px] text-xs',
)

const initial = computed(() => (c.value.alt ? c.value.alt.charAt(0).toUpperCase() : ''))
</script>

<template>
    <!-- 基于 reka-ui Avatar：图片加载成功才渲染，否则展示 fallback（可避免破图） -->
    <AvatarRoot v-bind="mergedRootAttrs"
        class="dp-avatar inline-flex shrink-0 items-center justify-center overflow-hidden border border-[var(--dp-color-border)] bg-[var(--dp-color-surface-3)] font-semibold text-[var(--dp-color-fg-2)]"
        :class="[sizeClass, s.round && 'rounded-full']">
        <template v-if="c.src">
            <AvatarImage :src="c.src" :alt="c.alt" class="h-full w-full object-cover" :style="imageStyle" />
            <AvatarFallback class="flex h-full w-full items-center justify-center">
                <slot>{{ initial }}</slot>
            </AvatarFallback>
        </template>
        <AvatarFallback v-else class="flex h-full w-full items-center justify-center">
            <slot>{{ initial }}</slot>
        </AvatarFallback>
    </AvatarRoot>
</template>
