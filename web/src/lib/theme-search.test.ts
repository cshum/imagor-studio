import { describe, expect, it } from 'vitest'

import { getThemeOverrideFromLocationSearch, parseThemeSearchParam } from './theme-search'

describe('theme-search', () => {
  it('accepts light and dark theme overrides', () => {
    expect(parseThemeSearchParam('light')).toBe('light')
    expect(parseThemeSearchParam('dark')).toBe('dark')
  })

  it('ignores invalid theme override values', () => {
    expect(parseThemeSearchParam('system')).toBeNull()
    expect(parseThemeSearchParam('')).toBeNull()
    expect(parseThemeSearchParam(undefined)).toBeNull()
  })

  it('extracts the theme override from location search', () => {
    expect(getThemeOverrideFromLocationSearch('?theme=dark')).toBe('dark')
    expect(getThemeOverrideFromLocationSearch('?header=0&theme=light')).toBe('light')
    expect(getThemeOverrideFromLocationSearch('?header=0')).toBeNull()
  })
})
