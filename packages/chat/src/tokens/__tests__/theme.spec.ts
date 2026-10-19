import { describe, expect, it } from 'vitest'
import { dpcColors, dpcColorsDark, dpcCssVars, dpcCssVarsDark } from '../theme'

describe('design tokens', () => {
  it('exports the beautiful-ui palette in both themes', () => {
    expect(dpcCssVars['--dpc-color-ink-2']).toBe(dpcColors.ink2)
    expect(dpcCssVars['--dpc-color-hover-2']).toBe(dpcColors.hover2)
    expect(dpcCssVars['--dpc-color-line-strong']).toBe(dpcColors.lineStrong)
    expect(dpcCssVarsDark['--dpc-color-accent']).toBe(dpcColorsDark.accent)
  })

  it('keeps the legacy token names used by existing components', () => {
    expect(dpcCssVars['--dpc-color-primary']).toBe(dpcColors.primary)
    expect(dpcCssVars['--dpc-color-text']).toBe(dpcColors.text)
    expect(dpcCssVars['--dpc-color-border']).toBe(dpcColors.border)
    expect(dpcCssVars['--dpc-color-bubble-user']).toBe(dpcColors.bubbleUser)
  })

  it('ships semantic radii and shadows', () => {
    expect(dpcCssVars['--dpc-radius-chip']).toBe('6px')
    expect(dpcCssVars['--dpc-radius-window']).toBe('14px')
    expect(dpcCssVars['--dpc-shadow-card']).toContain('var(--dpc-color-line)')
    expect(dpcCssVarsDark['--dpc-shadow-overlay']).toContain('oklch')
  })
})
