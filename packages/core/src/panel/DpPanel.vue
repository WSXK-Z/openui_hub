<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import { useDpProps } from '../composables/useDpProps.ts'
import type { DpProps } from '../types'
import {
    providePanelContext,
    useDpPanelGroup,
    type DpPanelAnchor,
    type DpPanelGroupHandle,
    type DpPanelStorage,
} from './panelContext'

defineOptions({ name: 'DpPanel', inheritAttrs: false })

export interface DpPanelComp {
    title: string
    collapsible: boolean
    defaultCollapsed: boolean
    size: 'small' | 'default' | 'wide'
    loading: boolean
    /** 面板名称，供 DpPage 的 getPanel / bringToFront 查找 */
    name: string
    /** 浮动模式下的停靠位 */
    anchor: DpPanelAnchor
    /** 浮动定位：脱离文档流并锚定到页面停靠位 */
    fixed: boolean
    /** 允许拖动标题栏移动 */
    movable: boolean
    /** 允许拖拽右下角调整尺寸 */
    resizable: boolean
    /** 初始位移（相对停靠位） */
    offset: [number, number]
    /** 初始宽度，0 表示自动 */
    width: number
    /** 初始高度，0 表示自动 */
    height: number
    /** 状态持久化的键名（配合 DpPage 的 persistNamespace） */
    persist: string
    /** 显示工具条（折叠 / 重置 / 置顶） */
    showTools: boolean
}

export interface DpPanelState {
    offset: [number, number]
    width: number
    height: number
    collapsed: boolean
}

/** DpPanel 模板 ref 暴露的方法 */
export interface DpPanelInst {
    reset: () => void
    collapse: () => void
    expand: () => void
    bringToFront: () => void
    setOffset: (offset: [number, number]) => void
    setSize: (size: { width?: number; height?: number }) => void
    getRect: () => DOMRect | null
}

export type DpPanelProps = DpProps<DpPanelComp>

const emit = defineEmits<{
    (e: 'collapse'): void
    (e: 'expand'): void
    (e: 'change', state: DpPanelState): void
}>()

let panelSeq = 0

const props = defineProps<DpPanelProps>()

const { comp: c, style: s, rootAttrs } = useDpProps<DpPanelComp>(props, {
    compDefaults: {
        title: '',
        collapsible: false,
        defaultCollapsed: false,
        size: 'default',
        loading: false,
        name: '',
        anchor: 'top-right',
        fixed: false,
        movable: false,
        resizable: false,
        offset: [0, 0],
        width: 0,
        height: 0,
        persist: '',
        showTools: false,
    },
    themeDefaults: { bordered: true },
})

panelSeq += 1
const id = `dp-panel-${panelSeq}`

const panelGroup = useDpPanelGroup()
const slots = useSlots()

const panelElRef = ref<HTMLElement | null>(null)
const collapsed = ref(c.value.defaultCollapsed)
const offset = ref<[number, number]>([...c.value.offset])
const panelWidth = ref(c.value.width)
const panelHeight = ref(c.value.height)
const zIndex = ref<number | null>(null)
const dragging = ref(false)
const resizing = ref(false)

const floating = computed(() => c.value.fixed || c.value.movable || c.value.resizable)
const showToolsBar = computed(() => c.value.showTools || !!slots.tools)

const classes = computed(() => [
    'dp-panel',
    'flex flex-col bg-[var(--dp-color-surface)] text-[var(--dp-color-fg)]',
    `dp-panel--${c.value.size}`,
    s.value.bordered &&
    'dp-panel--bordered border border-[var(--dp-color-border)] rounded-[var(--dp-radius-lg)]',
    collapsed.value && 'dp-panel--collapsed',
    floating.value && 'dp-panel--floating',
    floating.value && `dp-panel--anchor-${c.value.anchor}`,
    dragging.value && 'dp-panel--dragging',
    resizing.value && 'dp-panel--resizing',
])

const bodySizeClass = computed(() =>
    c.value.size === 'small' ? 'p-3' : c.value.size === 'wide' ? 'p-6' : 'p-5',
)

const floatingStyle = computed(() => {
    if (!floating.value) return undefined
    return {
        '--dp-panel-offset-x': `${offset.value[0]}px`,
        '--dp-panel-offset-y': `${offset.value[1]}px`,
        zIndex: zIndex.value ?? undefined,
        width: panelWidth.value > 0 ? `${panelWidth.value}px` : undefined,
        height: panelHeight.value > 0 ? `${panelHeight.value}px` : undefined,
    }
})

const mergedRootAttrs = computed(() => {
    if (!floating.value) return rootAttrs.value
    return { ...rootAttrs.value, style: [rootAttrs.value.style, floatingStyle.value] }
})

const toolsProps = computed(() => ({
    offset: offset.value,
    size: { width: panelWidth.value, height: panelHeight.value },
    collapsed: collapsed.value,
    collapse: collapsePanel,
    expand: expandPanel,
    reset,
    bringToFront,
}))

function setOffset(next: [number, number]) {
    offset.value = [Math.round(next[0]), Math.round(next[1])]
}

function setSize(next: { width?: number; height?: number }) {
    if (next.width !== undefined) panelWidth.value = Math.max(0, Math.round(next.width))
    if (next.height !== undefined) panelHeight.value = Math.max(0, Math.round(next.height))
}

function reset() {
    offset.value = [...c.value.offset]
    panelWidth.value = c.value.width
    panelHeight.value = c.value.height
    collapsed.value = c.value.defaultCollapsed
}

function collapsePanel() {
    if (collapsed.value) return
    collapsed.value = true
    emit('collapse')
}

function expandPanel() {
    if (!collapsed.value) return
    collapsed.value = false
    emit('expand')
}

function bringToFront() {
    const next = panelGroup?.bringToFront(id)
    if (next !== null && next !== undefined) zIndex.value = next
}

function getRect(): DOMRect | null {
    return panelElRef.value?.getBoundingClientRect() ?? null
}

function toggle() {
    if (collapsed.value) expandPanel()
    else collapsePanel()
}

const groupHandle: DpPanelGroupHandle = {
    id,
    get name() {
        return c.value.name || undefined
    },
    collapse: collapsePanel,
    expand: expandPanel,
    reset,
    bringToFront,
    getRect,
    getZIndex: () => zIndex.value,
}

// ── 拖动 ──────────────────────────────────────────────
let dragPointerId: number | null = null
let dragStartX = 0
let dragStartY = 0
let dragStartOffset: [number, number] = [0, 0]

function handleDragMove(event: PointerEvent) {
    if (dragPointerId === null || event.pointerId !== dragPointerId) return
    setOffset([dragStartOffset[0] + event.clientX - dragStartX, dragStartOffset[1] + event.clientY - dragStartY])
}

function endDrag() {
    if (dragPointerId === null) return
    dragPointerId = null
    dragging.value = false
    window.removeEventListener('pointermove', handleDragMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
}

function handleHeaderPointerdown(event: PointerEvent) {
    if (!c.value.movable || !floating.value || event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('.dp-panel__tools, .dp-panel__toggle, button, a, input, textarea, select')) return
    bringToFront()
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragStartOffset = [...offset.value]
    dragging.value = true
    window.addEventListener('pointermove', handleDragMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
}

// ── 调整尺寸 ──────────────────────────────────────────
let resizePointerId: number | null = null
let resizeStartX = 0
let resizeStartY = 0
let resizeStartWidth = 0
let resizeStartHeight = 0

function handleResizeMove(event: PointerEvent) {
    if (resizePointerId === null || event.pointerId !== resizePointerId) return
    setSize({
        width: Math.max(180, resizeStartWidth + event.clientX - resizeStartX),
        height: Math.max(120, resizeStartHeight + event.clientY - resizeStartY),
    })
}

function endResize() {
    if (resizePointerId === null) return
    resizePointerId = null
    resizing.value = false
    window.removeEventListener('pointermove', handleResizeMove)
    window.removeEventListener('pointerup', endResize)
    window.removeEventListener('pointercancel', endResize)
}

function handleResizePointerdown(event: PointerEvent) {
    if (!c.value.resizable || !floating.value || event.button !== 0) return
    event.stopPropagation()
    bringToFront()
    const rect = getRect()
    resizePointerId = event.pointerId
    resizeStartX = event.clientX
    resizeStartY = event.clientY
    resizeStartWidth = panelWidth.value || rect?.width || 320
    resizeStartHeight = panelHeight.value || rect?.height || 200
    resizing.value = true
    window.addEventListener('pointermove', handleResizeMove)
    window.addEventListener('pointerup', endResize)
    window.addEventListener('pointercancel', endResize)
}

// ── 持久化 ────────────────────────────────────────────
const storage = computed<DpPanelStorage | undefined>(() => {
    if (panelGroup?.persist.storage) return panelGroup.persist.storage
    if (typeof window === 'undefined') return undefined
    return {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
    }
})

const persistKey = computed(() => {
    if (!c.value.persist) return null
    const namespace = panelGroup?.persist.namespace
    return namespace ? `${namespace}:${c.value.persist}` : `dp-panel:${c.value.persist}`
})

let persistTimer: ReturnType<typeof setTimeout> | undefined

function restoreState() {
    const key = persistKey.value
    const store = storage.value
    if (!key || !store) return
    try {
        const raw = store.getItem(key)
        if (!raw) return
        const state = JSON.parse(raw) as Partial<DpPanelState>
        if (Array.isArray(state.offset) && state.offset.length === 2) {
            offset.value = [Number(state.offset[0]) || 0, Number(state.offset[1]) || 0]
        }
        if (typeof state.width === 'number') panelWidth.value = state.width
        if (typeof state.height === 'number') panelHeight.value = state.height
        if (typeof state.collapsed === 'boolean') collapsed.value = state.collapsed
    } catch {
        // 忽略损坏的持久化数据
    }
}

function schedulePersist() {
    const key = persistKey.value
    const store = storage.value
    if (!key || !store) return
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
        persistTimer = undefined
        store.setItem(
            key,
            JSON.stringify({
                offset: offset.value,
                width: panelWidth.value,
                height: panelHeight.value,
                collapsed: collapsed.value,
            } satisfies DpPanelState),
        )
    }, 200)
}

watch(
    () => [offset.value[0], offset.value[1], panelWidth.value, panelHeight.value, collapsed.value],
    () => {
        emit('change', {
            offset: [...offset.value],
            width: panelWidth.value,
            height: panelHeight.value,
            collapsed: collapsed.value,
        })
        schedulePersist()
    },
)

onMounted(() => {
    panelGroup?.registerPanel(groupHandle)
    restoreState()
})

onBeforeUnmount(() => {
    panelGroup?.unregisterPanel(id)
    if (persistTimer !== undefined) clearTimeout(persistTimer)
    endDrag()
    endResize()
})

providePanelContext({ id, title: c.value.title })

defineExpose<DpPanelInst>({
    reset,
    collapse: collapsePanel,
    expand: expandPanel,
    bringToFront,
    setOffset,
    setSize,
    getRect,
})
</script>

<template>
    <section ref="panelElRef" v-bind="mergedRootAttrs" :class="classes" @pointerdown="bringToFront">
        <header v-if="c.title || c.collapsible || showToolsBar || $slots.header"
            class="dp-panel__header flex items-center justify-between gap-2 px-5 py-3 font-semibold"
            :class="{ 'border-b border-[var(--dp-color-border)]': !collapsed, 'cursor-move': c.movable && floating }"
            @pointerdown="handleHeaderPointerdown">
            <slot name="header">
                <span class="dp-panel__title min-w-0 truncate text-sm">{{ c.title }}</span>
            </slot>
            <div class="flex shrink-0 items-center gap-1">
                <div v-if="showToolsBar" class="dp-panel__tools flex items-center gap-0.5" @pointerdown.stop>
                    <slot name="tools" v-bind="toolsProps">
                        <button v-if="c.collapsible" type="button" class="dp-panel__tool"
                            :aria-label="collapsed ? '展开' : '折叠'" @click="toggle">
                            {{ collapsed ? '▢' : '—' }}
                        </button>
                        <button type="button" class="dp-panel__tool" aria-label="重置" @click="reset">⟲</button>
                        <button type="button" class="dp-panel__tool" aria-label="置顶" @click="bringToFront">↑</button>
                    </slot>
                </div>
                <button v-if="c.collapsible && !showToolsBar" type="button"
                    class="dp-panel__toggle inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--dp-radius-sm)] bg-transparent text-[var(--dp-color-muted)] transition-colors duration-[140ms] hover:bg-[var(--dp-color-surface-2)] hover:text-[var(--dp-color-fg)]"
                    :aria-expanded="!collapsed" @click="toggle">
                    <span class="dp-panel__toggle-icon inline-block transition-transform duration-200"
                        :class="{ '-rotate-90': collapsed }" aria-hidden="true">
                        ▾
                    </span>
                </button>
            </div>
        </header>
        <div v-show="!collapsed" class="dp-panel__body relative" :class="[bodySizeClass, floating && 'min-h-0 flex-1 overflow-auto']">
            <slot />
            <div v-if="c.loading"
                class="dp-panel__loading absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--dp-color-surface)_70%,transparent)] text-[13px] text-[var(--dp-color-fg-2)]"
                role="status">
                Loading…
            </div>
        </div>
        <div v-if="floating && c.resizable" class="dp-panel__resize-handle" @pointerdown="handleResizePointerdown" />
    </section>
</template>

<style scoped>
.dp-panel--floating {
    position: absolute;
    max-width: calc(100% - 32px);
}

.dp-panel--dragging {
    user-select: none;
}

.dp-panel--anchor-top-left {
    top: 0;
    left: 0;
    transform: translate(
        calc(var(--dp-page-anchor-gap, 16px) + var(--dp-panel-offset-x, 0px)),
        calc(var(--dp-page-anchor-gap, 16px) + var(--dp-panel-offset-y, 0px))
    );
}

.dp-panel--anchor-top-center {
    top: 0;
    left: 50%;
    transform: translate(
        calc(-50% + var(--dp-panel-offset-x, 0px)),
        calc(var(--dp-page-anchor-gap, 16px) + var(--dp-panel-offset-y, 0px))
    );
}

.dp-panel--anchor-top-right {
    top: 0;
    right: 0;
    transform: translate(
        calc(var(--dp-panel-offset-x, 0px) - var(--dp-page-anchor-gap, 16px)),
        calc(var(--dp-page-anchor-gap, 16px) + var(--dp-panel-offset-y, 0px))
    );
}

.dp-panel--anchor-center {
    top: 50%;
    left: 50%;
    transform: translate(
        calc(-50% + var(--dp-panel-offset-x, 0px)),
        calc(-50% + var(--dp-panel-offset-y, 0px))
    );
}

.dp-panel--anchor-bottom-left {
    bottom: 0;
    left: 0;
    transform: translate(
        calc(var(--dp-page-anchor-gap, 16px) + var(--dp-panel-offset-x, 0px)),
        calc(var(--dp-panel-offset-y, 0px) - var(--dp-page-anchor-gap, 16px))
    );
}

.dp-panel--anchor-bottom-center {
    bottom: 0;
    left: 50%;
    transform: translate(
        calc(-50% + var(--dp-panel-offset-x, 0px)),
        calc(var(--dp-panel-offset-y, 0px) - var(--dp-page-anchor-gap, 16px))
    );
}

.dp-panel--anchor-bottom-right {
    right: 0;
    bottom: 0;
    transform: translate(
        calc(var(--dp-panel-offset-x, 0px) - var(--dp-page-anchor-gap, 16px)),
        calc(var(--dp-panel-offset-y, 0px) - var(--dp-page-anchor-gap, 16px))
    );
}

.dp-panel__tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: var(--dp-radius-sm);
    background: transparent;
    color: var(--dp-color-muted);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
}

.dp-panel__tool:hover {
    background: var(--dp-color-surface-2);
    color: var(--dp-color-fg);
}

.dp-panel__tool:focus-visible {
    outline: none;
    box-shadow: var(--dp-ring);
}

.dp-panel__resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(
        135deg,
        transparent 50%,
        var(--dp-color-border-strong) 50%,
        var(--dp-color-border-strong) 60%,
        transparent 60%
    );
}
</style>
