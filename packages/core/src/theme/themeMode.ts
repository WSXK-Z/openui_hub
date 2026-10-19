import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'

/** 主题模式：显式浅色 / 深色，或跟随系统 */
export type DpThemeMode = 'light' | 'dark' | 'system'

/** 解析后的实际主题 */
export type DpResolvedTheme = 'light' | 'dark'

export interface DpThemeControllerOptions {
    /** 显式模式；空字符串表示使用持久化值或默认值 */
    mode?: DpThemeMode | ''
    /** 无持久化值时使用的默认模式 */
    defaultMode?: DpThemeMode
    /** 是否写入 localStorage */
    persist?: boolean
    /** localStorage 键名 */
    storageKey?: string
    /** 把解析后的主题写到 document.documentElement 的 data-dp-theme */
    applyToDocument?: boolean
    /** 初始模式是否读取 document 上已有的 data-dp-theme */
    useDocumentInitial?: boolean
    /** 是否在当前组件作用域销毁时自动清理监听（默认 true） */
    disposeOnScope?: boolean
}

export interface DpThemeController {
    mode: Ref<DpThemeMode>
    resolvedMode: ComputedRef<DpResolvedTheme>
    isDark: ComputedRef<boolean>
    setMode: (mode: DpThemeMode) => void
    toggleMode: () => void
    dispose: () => void
}

export const DP_THEME_STORAGE_KEY = 'dp-ui-theme'

const SYSTEM_QUERY = '(prefers-color-scheme: dark)'

function normalizeMode(value: unknown): DpThemeMode | null {
    return value === 'light' || value === 'dark' || value === 'system' ? value : null
}

function getStorage(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function readStoredMode(storageKey: string): DpThemeMode | null {
    try {
        return normalizeMode(getStorage()?.getItem(storageKey))
    } catch {
        return null
    }
}

function writeStoredMode(storageKey: string, mode: DpThemeMode) {
    try {
        getStorage()?.setItem(storageKey, mode)
    } catch {
        // 隐私模式或存储不可用时忽略
    }
}

function readDocumentMode(): DpThemeMode | null {
    if (typeof document === 'undefined') return null
    return normalizeMode(document.documentElement.getAttribute('data-dp-theme'))
}

function getSystemDark(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(SYSTEM_QUERY).matches
}

/** 创建主题控制器；DpThemeProvider 与 useTheme(options) 函数式作用域共用同一套状态逻辑 */
export function createThemeController(options: DpThemeControllerOptions = {}): DpThemeController {
    const persist = options.persist ?? true
    const storageKey = options.storageKey || DP_THEME_STORAGE_KEY
    const defaultMode = normalizeMode(options.defaultMode) ?? 'system'

    const explicitMode = normalizeMode(options.mode)
    const storedMode = persist ? readStoredMode(storageKey) : null
    const documentMode = options.useDocumentInitial ? readDocumentMode() : null
    const initialMode: DpThemeMode =
        explicitMode ?? storedMode ?? documentMode ?? defaultMode

    const mode = ref<DpThemeMode>(initialMode)
    const systemDark = ref(getSystemDark())
    const resolvedMode = computed<DpResolvedTheme>(() =>
        mode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : mode.value,
    )
    const isDark = computed(() => resolvedMode.value === 'dark')

    const mediaQuery =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia(SYSTEM_QUERY)
            : null

    function handleSystemChange(event: MediaQueryListEvent) {
        systemDark.value = event.matches
    }

    mediaQuery?.addEventListener('change', handleSystemChange)

    let previousDocumentTheme: string | null = null
    let documentThemeApplied = false

    function applyDocumentTheme() {
        if (!options.applyToDocument || typeof document === 'undefined') return
        const root = document.documentElement
        if (!documentThemeApplied) {
            previousDocumentTheme = root.getAttribute('data-dp-theme')
            documentThemeApplied = true
        }
        root.setAttribute('data-dp-theme', resolvedMode.value)
    }

    const stopDocumentWatch = options.applyToDocument
        ? watch(resolvedMode, applyDocumentTheme, { immediate: true })
        : () => undefined

    function restoreDocumentTheme() {
        if (!documentThemeApplied || typeof document === 'undefined') return
        const root = document.documentElement
        if (previousDocumentTheme === null) root.removeAttribute('data-dp-theme')
        else root.setAttribute('data-dp-theme', previousDocumentTheme)
        documentThemeApplied = false
    }

    function setMode(next: DpThemeMode) {
        const normalized = normalizeMode(next)
        if (!normalized) return
        mode.value = normalized
        if (persist) writeStoredMode(storageKey, normalized)
    }

    function toggleMode() {
        setMode(isDark.value ? 'light' : 'dark')
    }

    let disposed = false
    function dispose() {
        if (disposed) return
        disposed = true
        mediaQuery?.removeEventListener('change', handleSystemChange)
        stopDocumentWatch()
        restoreDocumentTheme()
    }

    if (options.disposeOnScope !== false && getCurrentScope()) {
        onScopeDispose(dispose)
    }

    return { mode, resolvedMode, isDark, setMode, toggleMode, dispose }
}
