import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { createStore } from '@/lib/create-store'

export type Theme = 'system' | 'light' | 'dark'

export interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark' // The actual theme being applied
  isLoaded: boolean
}

export type ThemeAction =
  | { type: 'SET_THEME'; payload: { theme: Theme } }
  | { type: 'SET_RESOLVED_THEME'; payload: { resolvedTheme: 'light' | 'dark' } }
  | { type: 'SET_LOADED'; payload: { isLoaded: boolean } }

const initialState: ThemeState = {
  theme: 'system',
  resolvedTheme: 'light',
  isLoaded: false,
}

const reducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload.theme,
      }

    case 'SET_RESOLVED_THEME':
      return {
        ...state,
        resolvedTheme: action.payload.resolvedTheme,
      }

    case 'SET_LOADED':
      return {
        ...state,
        isLoaded: action.payload.isLoaded,
      }

    default:
      return state
  }
}

// Create the store
export const themeStore = createStore(initialState, reducer)

// Theme management
let storage: ConfigStorage | null = null
let mediaQuery: MediaQueryList | null = null
let attribute: string = 'class'

/**
 * Get system theme preference
 */
const getSystemTheme = (): 'light' | 'dark' => {
  return mediaQuery?.matches ? 'dark' : 'light'
}

/**
 * Apply theme to document
 */
const applyTheme = (theme: 'light' | 'dark') => {
  if (attribute === 'class') {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  } else {
    document.documentElement.setAttribute(attribute, theme)
  }
}

/**
 * Update resolved theme and apply it
 */
const updateResolvedTheme = () => {
  const state = themeStore.getState()
  const resolvedTheme = state.theme === 'system' ? getSystemTheme() : state.theme

  themeStore.dispatch({
    type: 'SET_RESOLVED_THEME',
    payload: { resolvedTheme },
  })

  applyTheme(resolvedTheme)
}

/**
 * Handle system theme changes
 */
const handleSystemThemeChange = () => {
  const state = themeStore.getState()
  if (state.theme === 'system') {
    updateResolvedTheme()
  }
}

/**
 * Initialize theme system with storage
 */
export const initializeTheme = async (
  configStorage: ConfigStorage,
  themeAttribute: string = 'class',
) => {
  // Cleanup previous initialization
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }

  storage = configStorage
  attribute = themeAttribute
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  // Listen for system theme changes
  mediaQuery.addEventListener('change', handleSystemThemeChange)

  try {
    // Load theme from storage
    const storedTheme = await storage.get()
    const theme =
      storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
        ? (storedTheme as Theme)
        : 'system'

    themeStore.dispatch({
      type: 'SET_THEME',
      payload: { theme },
    })

    updateResolvedTheme()

    themeStore.dispatch({
      type: 'SET_LOADED',
      payload: { isLoaded: true },
    })
  } catch {
    // Failed to load from storage - fallback to system theme
    updateResolvedTheme()
    themeStore.dispatch({
      type: 'SET_LOADED',
      payload: { isLoaded: true },
    })
  }
}

/**
 * Set theme
 */
export const setTheme = async (theme: Theme) => {
  themeStore.dispatch({
    type: 'SET_THEME',
    payload: { theme },
  })

  updateResolvedTheme()
  await storage?.set(theme)
}
/**
 * Reset theme to system default and clear storage
 */
export const resetTheme = async () => {
  if (storage) {
    await storage.remove()
  }
  await setTheme('system')
}

/**
 * Cleanup theme system
 */
export const destroy = () => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
    mediaQuery = null
  }
  storage = null
}

// Hook for components to use the theme store
export const useTheme = () => {
  const state = themeStore.useStore()

  return {
    theme: state.theme,
    resolvedTheme: state.resolvedTheme,
    isLoaded: state.isLoaded,
    setTheme,
  }
}
