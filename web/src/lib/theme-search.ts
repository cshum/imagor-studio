export type UrlThemeOverride = 'light' | 'dark'

export const parseThemeSearchParam = (value: unknown): UrlThemeOverride | null => {
  return value === 'light' || value === 'dark' ? value : null
}

export const getThemeOverrideFromLocationSearch = (
  locationSearch: string,
): UrlThemeOverride | null => {
  return parseThemeSearchParam(new URLSearchParams(locationSearch).get('theme'))
}
