import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { createThemeController, DP_THEME_STORAGE_KEY } from '../themeMode'

type MediaListener = (event: MediaQueryListEvent) => void

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<MediaListener>()
  const mediaQuery = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
  }
  window.matchMedia = vi.fn(() => mediaQuery) as unknown as typeof window.matchMedia
  return {
    emit(next: boolean) {
      mediaQuery.matches = next
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
    },
    listeners,
  }
}

describe('createThemeController', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-dp-theme')
  })

  it('resolves system mode from the system preference', () => {
    stubMatchMedia(true)
    const controller = createThemeController({ disposeOnScope: false })

    expect(controller.mode.value).toBe('system')
    expect(controller.resolvedMode.value).toBe('dark')
    expect(controller.isDark.value).toBe(true)

    controller.setMode('light')
    expect(controller.mode.value).toBe('light')
    expect(controller.resolvedMode.value).toBe('light')

    controller.toggleMode()
    expect(controller.mode.value).toBe('dark')
    controller.dispose()
  })

  it('reacts to system preference changes while in system mode', async () => {
    const media = stubMatchMedia(false)
    const controller = createThemeController({ disposeOnScope: false, persist: false })

    expect(controller.resolvedMode.value).toBe('light')
    media.emit(true)
    await nextTick()
    expect(controller.resolvedMode.value).toBe('dark')

    controller.setMode('light')
    media.emit(false)
    await nextTick()
    expect(controller.resolvedMode.value).toBe('light')
    controller.dispose()
  })

  it('persists the selected mode and restores it for a new controller', () => {
    stubMatchMedia(false)
    const first = createThemeController({ disposeOnScope: false })
    first.setMode('dark')
    expect(localStorage.getItem(DP_THEME_STORAGE_KEY)).toBe('dark')
    first.dispose()

    const second = createThemeController({ disposeOnScope: false })
    expect(second.mode.value).toBe('dark')
    second.dispose()
  })

  it('does not persist when persist is false', () => {
    stubMatchMedia(false)
    const controller = createThemeController({ persist: false, disposeOnScope: false })
    controller.setMode('dark')
    expect(localStorage.getItem(DP_THEME_STORAGE_KEY)).toBeNull()
    controller.dispose()
  })

  it('prefers an explicit mode over the stored value', () => {
    stubMatchMedia(false)
    localStorage.setItem(DP_THEME_STORAGE_KEY, 'dark')
    const controller = createThemeController({ mode: 'light', disposeOnScope: false })
    expect(controller.mode.value).toBe('light')
    controller.dispose()
  })

  it('applies the resolved theme to the document and restores it on dispose', async () => {
    stubMatchMedia(true)
    document.documentElement.setAttribute('data-dp-theme', 'cool-neutral')

    const controller = createThemeController({
      applyToDocument: true,
      persist: false,
      disposeOnScope: false,
    })
    expect(document.documentElement.getAttribute('data-dp-theme')).toBe('dark')

    controller.setMode('light')
    await nextTick()
    expect(document.documentElement.getAttribute('data-dp-theme')).toBe('light')

    controller.dispose()
    expect(document.documentElement.getAttribute('data-dp-theme')).toBe('cool-neutral')
  })

  it('disposes with its owning scope', () => {
    const media = stubMatchMedia(false)
    const scope = effectScope()
    scope.run(() => createThemeController({ persist: false }))
    expect(media.listeners.size).toBe(1)
    scope.stop()
    expect(media.listeners.size).toBe(0)
  })
})
