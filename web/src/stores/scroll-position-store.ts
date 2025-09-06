import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { createStore } from '@/lib/create-store'

export interface ScrollPositionState {
  positions: Record<string, number> // key: route/component identifier, value: scroll position
  isScrolling: Record<string, boolean> // track scrolling state per component
  isLoaded: boolean
}

export type ScrollPositionAction =
  | { type: 'SET_POSITION'; payload: { key: string; position: number } }
  | { type: 'SET_SCROLLING'; payload: { key: string; isScrolling: boolean } }
  | { type: 'CLEAR_POSITION'; payload: { key: string } }
  | { type: 'CLEAR_ALL_POSITIONS' }
  | { type: 'SET_LOADED'; payload: { isLoaded: boolean } }
  | { type: 'LOAD_POSITIONS'; payload: { positions: Record<string, number> } }

const initialState: ScrollPositionState = {
  positions: {},
  isScrolling: {},
  isLoaded: false,
}

const reducer = (state: ScrollPositionState, action: ScrollPositionAction): ScrollPositionState => {
  switch (action.type) {
    case 'SET_POSITION':
      return {
        ...state,
        positions: {
          ...state.positions,
          [action.payload.key]: action.payload.position,
        },
      }

    case 'SET_SCROLLING':
      return {
        ...state,
        isScrolling: {
          ...state.isScrolling,
          [action.payload.key]: action.payload.isScrolling,
        },
      }

    case 'CLEAR_POSITION': {
      const newPositions = { ...state.positions }
      const newScrolling = { ...state.isScrolling }
      delete newPositions[action.payload.key]
      delete newScrolling[action.payload.key]
      return {
        ...state,
        positions: newPositions,
        isScrolling: newScrolling,
      }
    }

    case 'CLEAR_ALL_POSITIONS':
      return {
        ...state,
        positions: {},
        isScrolling: {},
      }

    case 'SET_LOADED':
      return {
        ...state,
        isLoaded: action.payload.isLoaded,
      }

    case 'LOAD_POSITIONS':
      return {
        ...state,
        positions: action.payload.positions,
        isLoaded: true,
      }

    default:
      return state
  }
}

// Create the store
export const scrollPositionStore = createStore(initialState, reducer)

// Storage management
let storage: ConfigStorage | null = null
let saveTimeout: number | null = null
let saveDelay: number = 300

/**
 * Debounced save to storage
 */
const debouncedSaveToStorage = async () => {
  if (!storage) return

  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = window.setTimeout(async () => {
    const state = scrollPositionStore.getState()
    const positionsJson = JSON.stringify(state.positions)
    await storage!.set(positionsJson)
  }, saveDelay)
}

/**
 * Initialize scroll position system with storage
 */
export const initializeScrollPositions = async (
  configStorage: ConfigStorage,
  debounceDelay: number = 300,
) => {
  storage = configStorage
  saveDelay = debounceDelay

  try {
    const savedPositions = await storage.get()
    if (savedPositions) {
      const positions = JSON.parse(savedPositions)
      scrollPositionStore.dispatch({
        type: 'LOAD_POSITIONS',
        payload: { positions },
      })
    } else {
      scrollPositionStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true },
      })
    }
  } catch {
    // Failed to load from storage - continue with empty state
    scrollPositionStore.dispatch({
      type: 'SET_LOADED',
      payload: { isLoaded: true },
    })
  }

  // Set up auto-save subscription for position changes
  scrollPositionStore.subscribe((_, action) => {
    if (
      action.type === 'SET_POSITION' ||
      action.type === 'CLEAR_POSITION' ||
      action.type === 'CLEAR_ALL_POSITIONS'
    ) {
      debouncedSaveToStorage()
    }
  })
}

/**
 * Set scroll position for a key
 */
export const setPosition = (key: string, position: number) => {
  scrollPositionStore.dispatch({
    type: 'SET_POSITION',
    payload: { key, position },
  })
}

/**
 * Set scrolling state for a key
 */
export const setScrolling = (key: string, isScrolling: boolean) => {
  scrollPositionStore.dispatch({
    type: 'SET_SCROLLING',
    payload: { key, isScrolling },
  })
}

/**
 * Get scroll position for a key
 */
export const getPosition = (key: string): number => {
  const state = scrollPositionStore.getState()
  return state.positions[key] || 0
}

/**
 * Check if scrolling for a key
 */
export const isScrolling = (key: string): boolean => {
  const state = scrollPositionStore.getState()
  return state.isScrolling[key] || false
}

/**
 * Clear position for a key
 */
export const clearPosition = (key: string) => {
  scrollPositionStore.dispatch({
    type: 'CLEAR_POSITION',
    payload: { key },
  })
}

/**
 * Clear all positions
 */
export const clearAllPositions = () => {
  scrollPositionStore.dispatch({
    type: 'CLEAR_ALL_POSITIONS',
  })
}

/**
 * Force immediate save to storage (bypasses debounce)
 */
export const forceSave = async () => {
  if (!storage) return

  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }

  const state = scrollPositionStore.getState()
  const positionsJson = JSON.stringify(state.positions)
  await storage.set(positionsJson)
}

/**
 * Check if scroll positions are loaded
 */
export const isLoaded = (): boolean => {
  return scrollPositionStore.getState().isLoaded
}

/**
 * Cleanup scroll position system
 */
export const cleanup = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  storage = null
}

// Hook for components to use the scroll position store
export const useScrollPositions = () => {
  const state = scrollPositionStore.useStore()

  return {
    positions: state.positions,
    isScrollingStates: state.isScrolling,
    isStoreLoaded: state.isLoaded,
    setPosition,
    setScrolling,
    getPosition,
    isScrolling,
    clearPosition,
    clearAllPositions,
    forceSave,
    isLoaded,
  }
}
