import { createStore } from '@/lib/create-store'

export interface DragItem {
  key: string // Full path
  name: string
  type: 'folder' | 'image'
}

export interface DragDropState {
  isDragging: boolean
  draggedItems: DragItem[]
  dragOverTarget: string | null
  onDropHandler: ((items: DragItem[], targetFolderKey: string) => void | Promise<void>) | null
}

export type DragDropAction =
  | { type: 'START_DRAG'; payload: { items: DragItem[] } }
  | { type: 'END_DRAG' }
  | { type: 'SET_DRAG_OVER'; payload: { target: string | null } }
  | { type: 'CLEAR_DRAG_OVER' }
  | {
      type: 'REGISTER_DROP_HANDLER'
      payload: { handler: ((items: DragItem[], targetFolderKey: string) => void | Promise<void>) | null }
    }

const initialState: DragDropState = {
  isDragging: false,
  draggedItems: [],
  dragOverTarget: null,
  onDropHandler: null,
}

const reducer = (state: DragDropState, action: DragDropAction): DragDropState => {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        draggedItems: action.payload.items,
        dragOverTarget: null,
      }

    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        draggedItems: [],
        dragOverTarget: null,
      }

    case 'SET_DRAG_OVER':
      return {
        ...state,
        dragOverTarget: action.payload.target,
      }

    case 'CLEAR_DRAG_OVER':
      return {
        ...state,
        dragOverTarget: null,
      }

    case 'REGISTER_DROP_HANDLER':
      return {
        ...state,
        onDropHandler: action.payload.handler,
      }

    default:
      return state
  }
}

// Create the store
export const dragDropStore = createStore(initialState, reducer)

/**
 * Start dragging items
 */
export const startDrag = (items: DragItem[]) => {
  dragDropStore.dispatch({
    type: 'START_DRAG',
    payload: { items },
  })
}

/**
 * End dragging
 */
export const endDrag = () => {
  dragDropStore.dispatch({
    type: 'END_DRAG',
  })
}

/**
 * Set drag over target
 */
export const setDragOver = (target: string | null) => {
  dragDropStore.dispatch({
    type: 'SET_DRAG_OVER',
    payload: { target },
  })
}

/**
 * Clear drag over target
 */
export const clearDragOver = () => {
  dragDropStore.dispatch({
    type: 'CLEAR_DRAG_OVER',
  })
}

/**
 * Register drop handler (called by gallery page)
 */
export const registerDropHandler = (
  handler: ((items: DragItem[], targetFolderKey: string) => void | Promise<void>) | null,
) => {
  dragDropStore.dispatch({
    type: 'REGISTER_DROP_HANDLER',
    payload: { handler },
  })
}

/**
 * Get current drag drop state
 */
export const getDragDropState = (): DragDropState => {
  return dragDropStore.getState()
}

// Hook for components to use the drag drop store
export const useDragDrop = () => {
  const state = dragDropStore.useStore()

  return {
    isDragging: state.isDragging,
    draggedItems: state.draggedItems,
    dragOverTarget: state.dragOverTarget,
    onDropHandler: state.onDropHandler,
    startDrag,
    endDrag,
    setDragOver,
    clearDragOver,
    registerDropHandler,
  }
}
