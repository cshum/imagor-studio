import { useBreakpoint } from '@/hooks/use-breakpoint'
import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { createStore } from '@/lib/create-store'

export interface SidebarState {
  open: boolean
  openMobile: boolean
  isLoaded: boolean
}

export type SidebarAction =
  | { type: 'SET_OPEN'; payload: { open: boolean } }
  | { type: 'SET_OPEN_MOBILE'; payload: { openMobile: boolean } }
  | { type: 'SET_LOADED'; payload: { isLoaded: boolean } }
  | { type: 'TOGGLE' }
  | { type: 'TOGGLE_MOBILE' }

const initialState: SidebarState = {
  open: false, // Closed by default
  openMobile: false, // Mobile sidebar also closed by default
  isLoaded: false, // Loading state for storage
}

const reducer = (state: SidebarState, action: SidebarAction): SidebarState => {
  switch (action.type) {
    case 'SET_OPEN':
      return {
        ...state,
        open: action.payload.open,
      }

    case 'SET_OPEN_MOBILE':
      return {
        ...state,
        openMobile: action.payload.openMobile,
      }

    case 'SET_LOADED':
      return {
        ...state,
        isLoaded: action.payload.isLoaded,
      }

    case 'TOGGLE':
      return {
        ...state,
        open: !state.open,
      }

    case 'TOGGLE_MOBILE':
      return {
        ...state,
        openMobile: !state.openMobile,
      }

    default:
      return state
  }
}

// Create the store
export const sidebarStore = createStore(initialState, reducer)

// Sidebar management
let storage: ConfigStorage | null = null

/**
 * Initialize sidebar system with storage
 */
export const initializeSidebar = async (configStorage: ConfigStorage) => {
  storage = configStorage

  try {
    // Load sidebar state from storage
    const savedState = await storage.get()
    const open = savedState === 'true'

    sidebarStore.dispatch({
      type: 'SET_OPEN',
      payload: { open },
    })

    sidebarStore.dispatch({
      type: 'SET_LOADED',
      payload: { isLoaded: true },
    })
  } catch {
    // Failed to load from storage - use default (closed)
    sidebarStore.dispatch({
      type: 'SET_LOADED',
      payload: { isLoaded: true },
    })
  }
}

/**
 * Set sidebar open state
 */
export const setSidebarOpen = async (open: boolean, isMobile?: boolean) => {
  // Calculate isMobile if not provided
  const mobile = isMobile ?? (typeof window !== 'undefined' && window.innerWidth < 768)

  if (mobile) {
    sidebarStore.dispatch({
      type: 'SET_OPEN_MOBILE',
      payload: { openMobile: open },
    })
  } else {
    sidebarStore.dispatch({
      type: 'SET_OPEN',
      payload: { open },
    })

    // Save desktop state to storage
    await storage?.set(open.toString())
  }
}

/**
 * Toggle sidebar
 */
export const toggleSidebar = async (isMobile?: boolean) => {
  // Calculate isMobile if not provided
  const mobile = isMobile ?? (typeof window !== 'undefined' && window.innerWidth < 768)

  if (mobile) {
    sidebarStore.dispatch({ type: 'TOGGLE_MOBILE' })
  } else {
    sidebarStore.dispatch({ type: 'TOGGLE' })

    // Save new state to storage
    const newState = sidebarStore.getState()
    await storage?.set(newState.open.toString())
  }
}

/**
 * Get current sidebar state
 */
export const getSidebarState = (): SidebarState => {
  return sidebarStore.getState()
}

/**
 * Check if sidebar is loaded
 */
export const isLoaded = (): boolean => {
  return sidebarStore.getState().isLoaded
}

/**
 * Reset sidebar to default state and clear storage
 */
export const resetSidebar = async () => {
  if (storage) {
    await storage.remove()
  }
  await setSidebarOpen(false)
}

/**
 * Cleanup sidebar system
 */
export const cleanup = () => {
  storage = null
}

// Hook for components to use the sidebar store
export const useSidebar = () => {
  const state = sidebarStore.useStore()
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  return {
    open: state.open,
    openMobile: state.openMobile,
    isMobile,
    isLoaded: state.isLoaded,
    state: state.open ? 'expanded' : 'collapsed',
    setOpen: (open: boolean) => setSidebarOpen(open, isMobile),
    setOpenMobile: (open: boolean) => setSidebarOpen(open, true),
    toggleSidebar: () => toggleSidebar(isMobile),
  }
}
