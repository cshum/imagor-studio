import { createStore } from '@/lib/create-store'

export interface SelectionState {
  // Single Set containing both folder and image keys
  // Folder keys end with "/", image keys don't
  selectedItems: Set<string>

  // Track last selected item for shift-click range selection
  lastSelectedKey: string | null
  lastSelectedIndex: number
  lastSelectedType: 'folder' | 'image' | null

  // Current gallery context for range selection
  currentGalleryKey: string
}

export type SelectionAction =
  | {
      type: 'TOGGLE_ITEM'
      payload: {
        itemKey: string // Full path with trailing / for folders
        index: number
        itemType: 'folder' | 'image'
      }
    }
  | {
      type: 'SELECT_RANGE'
      payload: {
        items: Array<{ key: string; type: 'folder' | 'image' }>
        endIndex: number
        endType: 'folder' | 'image'
      }
    }
  | {
      type: 'SELECT_ALL'
      payload: {
        items: Array<{ key: string; type: 'folder' | 'image' }>
      }
    }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_GALLERY_CONTEXT'; payload: { galleryKey: string } }

const initialState: SelectionState = {
  selectedItems: new Set(),
  lastSelectedKey: null,
  lastSelectedIndex: -1,
  lastSelectedType: null,
  currentGalleryKey: '',
}

const reducer = (state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case 'TOGGLE_ITEM': {
      const newSelectedItems = new Set(state.selectedItems)

      if (newSelectedItems.has(action.payload.itemKey)) {
        newSelectedItems.delete(action.payload.itemKey)
      } else {
        newSelectedItems.add(action.payload.itemKey)
      }

      return {
        ...state,
        selectedItems: newSelectedItems,
        lastSelectedKey: action.payload.itemKey,
        lastSelectedIndex: action.payload.index,
        lastSelectedType: action.payload.itemType,
      }
    }

    case 'SELECT_RANGE': {
      const newSelectedItems = new Set(state.selectedItems)

      // Add all items in the range
      action.payload.items.forEach((item) => {
        newSelectedItems.add(item.key)
      })

      return {
        ...state,
        selectedItems: newSelectedItems,
        lastSelectedKey: action.payload.items[action.payload.items.length - 1]?.key || null,
        lastSelectedIndex: action.payload.endIndex,
        lastSelectedType: action.payload.endType,
      }
    }

    case 'SELECT_ALL': {
      const newSelectedItems = new Set<string>()

      action.payload.items.forEach((item) => {
        newSelectedItems.add(item.key)
      })

      return {
        ...state,
        selectedItems: newSelectedItems,
        lastSelectedKey: null,
        lastSelectedIndex: -1,
        lastSelectedType: null,
      }
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedItems: new Set(),
        lastSelectedKey: null,
        lastSelectedIndex: -1,
        lastSelectedType: null,
      }

    case 'SET_GALLERY_CONTEXT':
      return {
        ...state,
        currentGalleryKey: action.payload.galleryKey,
        // Clear selection when changing gallery context
        selectedItems: new Set(),
        lastSelectedKey: null,
        lastSelectedIndex: -1,
        lastSelectedType: null,
      }

    default:
      return state
  }
}

// Create the store
export const selectionStore = createStore(initialState, reducer)

/**
 * Helper functions
 */

/**
 * Create selection key for folder
 */
export const createFolderKey = (galleryKey: string): string => {
  return galleryKey.endsWith('/') ? galleryKey : `${galleryKey}/`
}

/**
 * Create selection key for image
 */
export const createImageKey = (galleryKey: string, imageKey: string): string => {
  return galleryKey ? `${galleryKey}/${imageKey}` : imageKey
}

/**
 * Check if key is a folder
 */
export const isFolderKey = (key: string): boolean => {
  return key.endsWith('/')
}

/**
 * Get selected folders and images separately
 */
export const splitSelections = (selectedItems: Set<string>) => {
  const folders: string[] = []
  const images: string[] = []

  selectedItems.forEach((key) => {
    if (isFolderKey(key)) {
      folders.push(key)
    } else {
      images.push(key)
    }
  })

  return { folders, images }
}

/**
 * Toggle item selection
 */
export const toggleItem = (itemKey: string, index: number, itemType: 'folder' | 'image') => {
  selectionStore.dispatch({
    type: 'TOGGLE_ITEM',
    payload: { itemKey, index, itemType },
  })
}

/**
 * Select range of items
 */
export const selectRange = (
  items: Array<{ key: string; type: 'folder' | 'image' }>,
  endIndex: number,
  endType: 'folder' | 'image',
) => {
  selectionStore.dispatch({
    type: 'SELECT_RANGE',
    payload: { items, endIndex, endType },
  })
}

/**
 * Select all items
 */
export const selectAll = (items: Array<{ key: string; type: 'folder' | 'image' }>) => {
  selectionStore.dispatch({
    type: 'SELECT_ALL',
    payload: { items },
  })
}

/**
 * Clear selection
 */
export const clearSelection = () => {
  selectionStore.dispatch({
    type: 'CLEAR_SELECTION',
  })
}

/**
 * Set gallery context (clears selection)
 */
export const setGalleryContext = (galleryKey: string) => {
  selectionStore.dispatch({
    type: 'SET_GALLERY_CONTEXT',
    payload: { galleryKey },
  })
}

/**
 * Get current selection state
 */
export const getSelectionState = (): SelectionState => {
  return selectionStore.getState()
}

/**
 * Check if item is selected
 */
export const isItemSelected = (itemKey: string): boolean => {
  const state = selectionStore.getState()
  return state.selectedItems.has(itemKey)
}

/**
 * Get selection count
 */
export const getSelectionCount = (): number => {
  const state = selectionStore.getState()
  return state.selectedItems.size
}

/**
 * Get visible selection count (filtered by visible items)
 */
export const getVisibleSelectionCount = (visibleKeys: string[]): number => {
  const state = selectionStore.getState()
  const visibleSet = new Set(visibleKeys)
  let count = 0

  state.selectedItems.forEach((key) => {
    if (visibleSet.has(key)) {
      count++
    }
  })

  return count
}

// Hook for components to use the selection store
export const useSelection = () => {
  const state = selectionStore.useStore()

  return {
    selectedItems: state.selectedItems,
    lastSelectedKey: state.lastSelectedKey,
    lastSelectedIndex: state.lastSelectedIndex,
    lastSelectedType: state.lastSelectedType,
    currentGalleryKey: state.currentGalleryKey,
    toggleItem,
    selectRange,
    selectAll,
    clearSelection,
    setGalleryContext,
    isItemSelected,
    getSelectionCount,
    getVisibleSelectionCount,
    splitSelections: () => splitSelections(state.selectedItems),
  }
}
