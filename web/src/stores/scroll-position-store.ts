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

// Scroll position manager class
class ScrollPositionManager {
  private storage: ConfigStorage
  private saveTimeout: number | null = null
  private saveDelay: number = 100
  private pendingChanges: boolean = false

  constructor(storage: ConfigStorage, saveDelay: number = 100) {
    this.storage = storage
    this.saveDelay = saveDelay
  }

  async initialize() {
    try {
      const savedPositions = await this.storage.get()
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
    } catch (error) {
      console.warn('Failed to load scroll positions from storage:', error)
      scrollPositionStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true },
      })
    }
  }

  private debouncedSaveToStorage() {
    // Mark that we have pending changes
    this.pendingChanges = true

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // Set new timeout to save after debounce delay
    this.saveTimeout = window.setTimeout(async () => {
      if (this.pendingChanges) {
        try {
          const state = scrollPositionStore.getState()
          const positionsJson = JSON.stringify(state.positions)
          await this.storage.set(positionsJson)
          this.pendingChanges = false
        } catch (error) {
          console.warn('Failed to save scroll positions to storage:', error)
        }
      }
    }, this.saveDelay)
  }

  setPosition(key: string, position: number) {
    // Always update the store immediately
    scrollPositionStore.dispatch({
      type: 'SET_POSITION',
      payload: { key, position },
    })

    // Debounce the storage save operation
    this.debouncedSaveToStorage()
  }

  setScrolling(key: string, isScrolling: boolean) {
    // Scrolling state doesn't need to be persisted to storage
    scrollPositionStore.dispatch({
      type: 'SET_SCROLLING',
      payload: { key, isScrolling },
    })
  }

  getPosition(key: string): number {
    const state = scrollPositionStore.getState()
    return state.positions[key] || 0
  }

  isScrolling(key: string): boolean {
    const state = scrollPositionStore.getState()
    return state.isScrolling[key] || false
  }

  clearPosition(key: string) {
    scrollPositionStore.dispatch({
      type: 'CLEAR_POSITION',
      payload: { key },
    })

    // Debounce the storage save operation
    this.debouncedSaveToStorage()
  }

  clearAllPositions() {
    scrollPositionStore.dispatch({
      type: 'CLEAR_ALL_POSITIONS',
    })

    // Debounce the storage save operation
    this.debouncedSaveToStorage()
  }

  // Force immediate save (useful for cleanup or critical saves)
  async forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    if (this.pendingChanges) {
      try {
        const state = scrollPositionStore.getState()
        const positionsJson = JSON.stringify(state.positions)
        await this.storage.set(positionsJson)
        this.pendingChanges = false
      } catch (error) {
        console.warn('Failed to force save scroll positions to storage:', error)
      }
    }
  }

  cleanup() {
    // Force save any pending changes before cleanup
    if (this.pendingChanges) {
      this.forceSave()
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
  }
}

// Global scroll position manager instance
let scrollPositionManager: ScrollPositionManager | null = null

/**
 * Initialize scroll position system with storage
 */
export const initializeScrollPositions = async (
  storage: ConfigStorage,
  saveDelay: number = 300,
) => {
  if (!scrollPositionManager) {
    scrollPositionManager = new ScrollPositionManager(storage, saveDelay)
    await scrollPositionManager.initialize()
  }
}

/**
 * Set scroll position for a key
 */
export const setPosition = (key: string, position: number) => {
  scrollPositionManager?.setPosition(key, position)
}

/**
 * Set scrolling state for a key
 */
export const setScrolling = (key: string, isScrolling: boolean) => {
  scrollPositionManager?.setScrolling(key, isScrolling)
}

/**
 * Get scroll position for a key
 */
export const getPosition = (key: string): number => {
  return scrollPositionManager?.getPosition(key) || 0
}

/**
 * Check if scrolling for a key
 */
export const isScrolling = (key: string): boolean => {
  return scrollPositionManager?.isScrolling(key) || false
}

/**
 * Clear position for a key
 */
export const clearPosition = (key: string) => {
  scrollPositionManager?.clearPosition(key)
}

/**
 * Clear all positions
 */
export const clearAllPositions = () => {
  scrollPositionManager?.clearAllPositions()
}

/**
 * Force immediate save to storage (bypasses debounce)
 */
export const forceSave = async () => {
  await scrollPositionManager?.forceSave()
}

/**
 * Check if scroll positions are loaded
 */
export const isLoaded = (): boolean => {
  return scrollPositionStore.getState().isLoaded
}

/**
 * Cleanup scroll position manager
 */
export const cleanup = () => {
  if (scrollPositionManager) {
    scrollPositionManager.cleanup()
    scrollPositionManager = null
  }
}

// Hook for components to use the scroll position store
export const useScrollPositions = () => {
  const state = scrollPositionStore.useStore()

  return {
    positions: state.positions,
    isScrollingStates: state.isScrolling,
    isStoreLoaded: state.isLoaded,
    initializeScrollPositions,
    setPosition,
    setScrolling,
    getPosition,
    isScrolling,
    clearPosition,
    clearAllPositions,
    forceSave,
    isLoaded,
    cleanup,
  }
}
