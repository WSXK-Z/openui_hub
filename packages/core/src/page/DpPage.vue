<script setup lang="ts">
import { computed, ref, shallowReactive } from 'vue'
import type { StyleValue } from 'vue'
import { useRoute } from 'vue-router'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps } from '../types'
import { providePageContext } from './pageContext'
import {
    dpPanelAnchors,
    provideDpPanelGroupContext,
    type DpPanelAnchor,
    type DpPanelGroupHandle,
    type DpPanelStorage,
} from '../panel/panelContext'

defineOptions({ name: 'DpPage', inheritAttrs: false })

export interface DpPageComp {
    title: string
    /** 需要渲染的停靠位，默认渲染全部 7 个位置 */
    anchors: readonly DpPanelAnchor[]
    /** 停靠位与页面边缘的间距 */
    anchorGap: number | string
    /** 面板状态持久化的命名空间（配合 DpPanel 的 comp.persist） */
    persistNamespace: string
    /** 自定义持久化存储，默认 localStorage */
    persistStorage: DpPanelStorage | undefined
}

export type DpPageProps = DpProps<DpPageComp>

/** DpPage 模板 ref 暴露的方法 */
export interface DpPageInst {
    getPanels: () => DpPanelGroupHandle[]
    getPanel: (name: string) => DpPanelGroupHandle | undefined
    bringToFront: (name: string) => boolean
    getAnchor: (anchor: DpPanelAnchor) => HTMLElement | null
}

const props = defineProps<DpPageProps>()

const { comp: c, rootAttrs } = useDpProps<DpPageComp>(props, {
    compDefaults: {
        title: '',
        anchors: dpPanelAnchors,
        anchorGap: 16,
        persistNamespace: '',
        persistStorage: undefined,
    },
})

const route = useRoute()

const title = computed(() => c.value.title || (route.meta.title as string | undefined) || '')

const pageElRef = ref<HTMLElement | null>(null)
const anchorElements = shallowReactive<Partial<Record<DpPanelAnchor, HTMLElement>>>({})
const panels = shallowReactive<DpPanelGroupHandle[]>([])
let panelZIndex = 100

const defaultStorage: DpPanelStorage | undefined =
    typeof window !== 'undefined'
        ? {
              getItem: (key) => window.localStorage.getItem(key),
              setItem: (key, value) => window.localStorage.setItem(key, value),
          }
        : undefined

function registerAnchor(anchor: DpPanelAnchor, element: Element | null) {
    if (element instanceof HTMLElement) anchorElements[anchor] = element
    else delete anchorElements[anchor]
}

function getAnchor(anchor: DpPanelAnchor): HTMLElement | null {
    return anchorElements[anchor] ?? null
}

function registerPanel(panel: DpPanelGroupHandle) {
    if (!panels.some((item) => item.id === panel.id)) panels.push(panel)
}

function unregisterPanel(id: string) {
    const index = panels.findIndex((panel) => panel.id === id)
    if (index !== -1) panels.splice(index, 1)
}

function getPanels(): DpPanelGroupHandle[] {
    return panels
}

function getPanel(name: string): DpPanelGroupHandle | undefined {
    return panels.find((panel) => panel.name === name)
}

function bringToFront(id: string): number | null {
    if (!panels.some((panel) => panel.id === id)) return null
    panelZIndex += 1
    return panelZIndex
}

function bringPanelToFront(name: string): boolean {
    const panel = getPanel(name)
    if (!panel) return false
    panel.bringToFront()
    return true
}

const anchorGap = computed(() =>
    typeof c.value.anchorGap === 'number' ? `${c.value.anchorGap}px` : c.value.anchorGap,
)

const pageStyle = computed<StyleValue>(
    () => [{ '--dp-page-anchor-gap': anchorGap.value }, rootAttrs.value.style] as StyleValue,
)

providePageContext({ title: title.value, meta: route.meta })
provideDpPanelGroupContext({
    registerPanel,
    unregisterPanel,
    getPanels,
    getPanel,
    bringToFront,
    get persist() {
        return {
            namespace: c.value.persistNamespace || undefined,
            storage: c.value.persistStorage ?? defaultStorage,
        }
    },
})

defineExpose<DpPageInst>({
    getPanels,
    getPanel,
    bringToFront: bringPanelToFront,
    getAnchor,
})
</script>

<template>
    <div ref="pageElRef" v-bind="rootAttrs" class="dp-page relative" :style="pageStyle">
        <div class="dp-page__anchors" aria-hidden="true">
            <div v-for="anchor in c.anchors" :key="anchor"
                :ref="(element) => registerAnchor(anchor, element as Element | null)"
                class="dp-page__anchor" :class="`dp-page__anchor--${anchor}`"
                :data-dp-panel-anchor="anchor" />
        </div>
        <slot />
    </div>
</template>

<style scoped>
.dp-page__anchors {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.dp-page__anchor {
    position: absolute;
    width: 0;
    height: 0;
}

.dp-page__anchor--top-left {
    top: var(--dp-page-anchor-gap, 16px);
    left: var(--dp-page-anchor-gap, 16px);
}

.dp-page__anchor--top-center {
    top: var(--dp-page-anchor-gap, 16px);
    left: 50%;
}

.dp-page__anchor--top-right {
    top: var(--dp-page-anchor-gap, 16px);
    right: var(--dp-page-anchor-gap, 16px);
}

.dp-page__anchor--center {
    top: 50%;
    left: 50%;
}

.dp-page__anchor--bottom-left {
    bottom: var(--dp-page-anchor-gap, 16px);
    left: var(--dp-page-anchor-gap, 16px);
}

.dp-page__anchor--bottom-center {
    bottom: var(--dp-page-anchor-gap, 16px);
    left: 50%;
}

.dp-page__anchor--bottom-right {
    right: var(--dp-page-anchor-gap, 16px);
    bottom: var(--dp-page-anchor-gap, 16px);
}
</style>
