import { describe, expect, it } from 'vitest'
import { dpCssVars } from '../../tokens'
import { dpThemeOverrideKeys } from '../themeOverrides'

describe('dpThemeOverrideKeys', () => {
  it('covers every built-in --dp-* token', () => {
    const expected = Object.keys(dpCssVars)
      .map((key) => key.replace(/^--dp-/, ''))
      .sort()

    expect([...dpThemeOverrideKeys].sort()).toEqual(expected)
  })
})
