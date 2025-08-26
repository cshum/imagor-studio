import { createStore } from '@/lib/create-store'

export interface ImagePosition {
  top: number
  left: number
  width: number
  height: number
}

export interface ImagePositionState {
  positions: Record<string, ImagePosition> // key: `${galleryKey}_${imageKey}`
}

export type ImagePositionAction =
  | { type: 'SET_POSITION'; payload: { key: string; position: ImagePosition } }
  | { type: 'CLEAR_POSITION'; payload: { key: string } }
  | { type: 'CLEAR_ALL_POSITIONS' }

const initialState: ImagePositionState = {
  positions: {},
}

const reducer = (state: ImagePositionState, action: ImagePositionAction): ImagePositionState => {
  switch (action.type) {
    case 'SET_POSITION':
      return {
        ...state,
        positions: {
          ...state.positions,
          [action.payload.key]: action.payload.position,
        },
      }

    case 'CLEAR_POSITION': {
      const { [action.payload.key]: _, ...remainingPositions } = state.positions
      return {
        ...state,
        positions: remainingPositions,
      }
    }

    case 'CLEAR_ALL_POSITIONS':
      return {
        ...state,
        positions: {},
      }

    default:
      return state
  }
}

// Create the store
export const imagePositionStore = createStore(initialState, reducer)

// Helper function to create storage key
const createKey = (galleryKey: string, imageKey: string) => `${galleryKey}_${imageKey}`

/**
 * Set position for an image
 */
export const setPosition = (galleryKey: string, imageKey: string, position: ImagePosition) => {
  const key = createKey(galleryKey, imageKey)
  imagePositionStore.dispatch({
    type: 'SET_POSITION',
    payload: { key, position },
  })
}

/**
 * Get position for an image
 */
export const getPosition = (galleryKey: string, imageKey: string): ImagePosition | null => {
  const key = createKey(galleryKey, imageKey)
  const state = imagePositionStore.getState()
  return state.positions[key] || null
}

/**
 * Clear position for an image
 */
export const clearPosition = (galleryKey: string, imageKey: string) => {
  const key = createKey(galleryKey, imageKey)
  imagePositionStore.dispatch({
    type: 'CLEAR_POSITION',
    payload: { key },
  })
}

/**
 * Clear all positions (useful for cleanup)
 */
export const clearAllPositions = () => {
  imagePositionStore.dispatch({
    type: 'CLEAR_ALL_POSITIONS',
  })
}

/**
 * Check if position exists for an image
 */
export const hasPosition = (galleryKey: string, imageKey: string): boolean => {
  return getPosition(galleryKey, imageKey) !== null
}

// Hook for components to use the store
export const useImagePosition = () => {
  const state = imagePositionStore.useStore()

  return {
    positions: state.positions,
    setPosition,
    getPosition,
    clearPosition,
    clearAllPositions,
    hasPosition,
  }
}
