import { createStore } from '@/lib/create-store'
import { ConfigStorage } from '@/lib/config-storage/config-storage'

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

// Theme management class
class ThemeManager {
  private storage: ConfigStorage
  private mediaQuery: MediaQueryList
  private attribute: string

  constructor(storage: ConfigStorage, attribute: string = 'class') {
    this.storage = storage
    this.attribute = attribute
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
  }

  private handleSystemThemeChange = () => {
    const state = themeStore.getState()
    if (state.theme === 'system') {
      this.updateResolvedTheme()
    }
  }

  private getSystemTheme(): 'light' | 'dark' {
    return this.mediaQuery.matches ? 'dark' : 'light'
  }

  private updateResolvedTheme() {
    const state = themeStore.getState()
    const resolvedTheme = state.theme === 'system' ? this.getSystemTheme() : state.theme

    themeStore.dispatch({
      type: 'SET_RESOLVED_THEME',
      payload: { resolvedTheme }
    })

    this.applyTheme(resolvedTheme)
  }

  private applyTheme(theme: 'light' | 'dark') {
    if (this.attribute === 'class') {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    } else {
      document.documentElement.setAttribute(this.attribute, theme)
    }
  }

  async initialize() {
    try {
      // Load theme from storage
      const storedTheme = await this.storage.get()
      const theme = (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')
        ? storedTheme as Theme
        : 'system'

      themeStore.dispatch({
        type: 'SET_THEME',
        payload: { theme }
      })

      this.updateResolvedTheme()

      themeStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true }
      })
    } catch (error) {
      console.warn('Failed to load theme from storage:', error)
      // Fallback to system theme
      this.updateResolvedTheme()
      themeStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true }
      })
    }
  }

  async setTheme(theme: Theme) {
    themeStore.dispatch({
      type: 'SET_THEME',
      payload: { theme }
    })

    this.updateResolvedTheme()

    // Save to storage
    try {
      await this.storage.set(theme)
    } catch (error) {
      console.warn('Failed to save theme to storage:', error)
    }
  }

  destroy() {
    this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange)
  }
}

// Global theme manager instance
let themeManager: ThemeManager | null = null

// Theme actions
export const themeActions = {
  /**
   * Initialize theme system with storage
   */
  initializeTheme: async (storage: ConfigStorage, attribute: string = 'class') => {
    if (themeManager) {
      themeManager.destroy()
    }

    themeManager = new ThemeManager(storage, attribute)
    await themeManager.initialize()
  },

  /**
   * Set theme
   */
  setTheme: async (theme: Theme) => {
    if (!themeManager) {
      console.warn('Theme manager not initialized')
      return
    }
    await themeManager.setTheme(theme)
  },

  /**
   * Get current theme state
   */
  getTheme: (): Theme => {
    return themeStore.getState().theme
  },

  /**
   * Get resolved theme (actual applied theme)
   */
  getResolvedTheme: (): 'light' | 'dark' => {
    return themeStore.getState().resolvedTheme
  },

  /**
   * Check if theme is loaded
   */
  isLoaded: (): boolean => {
    return themeStore.getState().isLoaded
  },

  /**
   * Cleanup theme manager
   */
  destroy: () => {
    if (themeManager) {
      themeManager.destroy()
      themeManager = null
    }
  }
}

// Hook for components to use the theme store
export const useTheme = () => {
  const state = themeStore.useStore()

  return {
    theme: state.theme,
    resolvedTheme: state.resolvedTheme,
    isLoaded: state.isLoaded,
    setTheme: themeActions.setTheme,
  }
}
