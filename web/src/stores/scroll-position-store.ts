import { createStore } from '@/lib/create-store'
import { ConfigStorage } from '@/lib/config-storage/config-storage'

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
      const { [action.payload.key]: _, ...remainingPositions } = state.positions
      const { [action.payload.key]: __, ...remainingScrolling } = state.isScrolling
      return {
        ...state,
        positions: remainingPositions,
        isScrolling: remainingScrolling,
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
  private saveDelay: number = 150

  constructor(storage: ConfigStorage) {
    this.storage = storage
  }

  async initialize() {
    try {
      const savedPositions = await this.storage.get()
      if (savedPositions) {
        const positions = JSON.parse(savedPositions)
        scrollPositionStore.dispatch({
          type: 'LOAD_POSITIONS',
          payload: { positions }
        })
      } else {
        scrollPositionStore.dispatch({
          type: 'SET_LOADED',
          payload: { isLoaded: true }
        })
      }
    } catch (error) {
      console.warn('Failed to load scroll positions from storage:', error)
      scrollPositionStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true }
      })
    }
  }

  private async savePositions() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = window.setTimeout(async () => {
      try {
        const state = scrollPositionStore.getState()
        const positionsJson = JSON.stringify(state.positions)
        await this.storage.set(positionsJson)
      } catch (error) {
        console.warn('Failed to save scroll positions to storage:', error)
      }
    }, this.saveDelay)
  }

  setPosition(key: string, position: number) {
    scrollPositionStore.dispatch({
      type: 'SET_POSITION',
      payload: { key, position }
    })
    this.savePositions()
  }

  setScrolling(key: string, isScrolling: boolean) {
    scrollPositionStore.dispatch({
      type: 'SET_SCROLLING',
      payload: { key, isScrolling }
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
      payload: { key }
    })
    this.savePositions()
  }

  clearAllPositions() {
    scrollPositionStore.dispatch({
      type: 'CLEAR_ALL_POSITIONS'
    })
    this.savePositions()
  }

  cleanup() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
  }
}

// Global scroll position manager instance
let scrollPositionManager: ScrollPositionManager | null = null

// Scroll position actions
export const scrollPositionActions = {
  /**
   * Initialize scroll position system with storage
   */
  initializeScrollPositions: async (storage: ConfigStorage) => {
    if (!scrollPositionManager) {
      scrollPositionManager = new ScrollPositionManager(storage)
      await scrollPositionManager.initialize()
    }
  },

  /**
   * Set scroll position for a key
   */
  setPosition: (key: string, position: number) => {
    if (!scrollPositionManager) {
      console.warn('Scroll position manager not initialized')
      return
    }
    scrollPositionManager.setPosition(key, position)
  },

  /**
   * Set scrolling state for a key
   */
  setScrolling: (key: string, isScrolling: boolean) => {
    if (!scrollPositionManager) {
      console.warn('Scroll position manager not initialized')
      return
    }
    scrollPositionManager.setScrolling(key, isScrolling)
  },

  /**
   * Get scroll position for a key
   */
  getPosition: (key: string): number => {
    if (!scrollPositionManager) {
      console.warn('Scroll position manager not initialized')
      return 0
    }
    return scrollPositionManager.getPosition(key)
  },

  /**
   * Check if scrolling for a key
   */
  isScrolling: (key: string): boolean => {
    if (!scrollPositionManager) {
      console.warn('Scroll position manager not initialized')
      return false
    }
    return scrollPositionManager.isScrolling(key)
  },

  /**
   * Clear position for a key
   */
  clearPosition: (key: string) => {
    if (!scrollPositionManager) {
      console.warn('Scroll position manager not initialized')
      return
    }
    scrollPositionManager.clearPosition(key)
  },

  /**
   * Clear all positions
   */
  clearAllPositions: () => {
    if (!scrollPositionManager) {
      console.warn('Scroll position manager not initialized')
      return
    }
    scrollPositionManager.clearAllPositions()
  },

  /**
   * Check if scroll positions are loaded
   */
  isLoaded: (): boolean => {
    return scrollPositionStore.getState().isLoaded
  },

  /**
   * Cleanup scroll position manager
   */
  cleanup: () => {
    if (scrollPositionManager) {
      scrollPositionManager.cleanup()
      scrollPositionManager = null
    }
  },
}

// Hook for components to use the scroll position store
export const useScrollPositions = () => {
  const state = scrollPositionStore.useStore()

  return {
    positions: state.positions,
    isScrollingStates: state.isScrolling,
    isStoreLoaded: state.isLoaded,
    ...scrollPositionActions,
  }
}
