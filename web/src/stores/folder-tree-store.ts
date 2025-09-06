import { getSystemRegistryObject } from '@/api/registry-api'
import { listFiles } from '@/api/storage-api'
import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { createStore } from '@/lib/create-store'

export interface FolderNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FolderNode[]
  isLoaded: boolean
  isExpanded: boolean
}

export interface FolderTreeState {
  rootFolders: FolderNode[]
  loadingPaths: Set<string>
  currentPath: string
  isRootFoldersLoaded: boolean
  isHomeTitleLoaded: boolean
  homeTitle: string
}

export type FolderTreeAction =
  | { type: 'SET_ROOT_FOLDERS'; folders: FolderNode[] }
  | { type: 'EXPAND_FOLDER'; path: string }
  | { type: 'COLLAPSE_FOLDER'; path: string }
  | { type: 'SET_FOLDER_CHILDREN'; path: string; children: FolderNode[] }
  | { type: 'SET_LOADING'; path: string; loading: boolean }
  | { type: 'SET_CURRENT_PATH'; path: string }
  | { type: 'SET_LOADED'; payload: { isLoaded: boolean } }
  | { type: 'LOAD_TREE_STATE'; payload: { rootFolders: FolderNode[]; currentPath: string } }
  | { type: 'LOAD_ROOT_FOLDERS' }
  | { type: 'SET_HOME_TITLE'; title: string }
  | { type: 'LOAD_HOME_TITLE' }

const initialState: FolderTreeState = {
  rootFolders: [],
  loadingPaths: new Set(),
  currentPath: '',
  isRootFoldersLoaded: false,
  isHomeTitleLoaded: false,
  homeTitle: 'Home',
}

function folderTreeReducer(state: FolderTreeState, action: FolderTreeAction): FolderTreeState {
  switch (action.type) {
    case 'SET_ROOT_FOLDERS':
      return {
        ...state,
        rootFolders: action.folders.map((folder) => {
          // Preserve expanded state from cache if it exists
          const existingFolder = state.rootFolders.find((f) => f.path === folder.path)
          return {
            ...folder,
            isLoaded: existingFolder?.isLoaded || false,
            isExpanded: existingFolder?.isExpanded || false,
            children: existingFolder?.children,
          }
        }),
      }

    case 'EXPAND_FOLDER': {
      const updateFolder = (folders: FolderNode[]): FolderNode[] =>
        folders.map((folder) =>
          folder.path === action.path
            ? { ...folder, isExpanded: true }
            : folder.children
              ? { ...folder, children: updateFolder(folder.children) }
              : folder,
        )

      return {
        ...state,
        rootFolders: updateFolder(state.rootFolders),
      }
    }

    case 'COLLAPSE_FOLDER': {
      const updateFolder = (folders: FolderNode[]): FolderNode[] =>
        folders.map((folder) =>
          folder.path === action.path
            ? { ...folder, isExpanded: false }
            : folder.children
              ? { ...folder, children: updateFolder(folder.children) }
              : folder,
        )

      return {
        ...state,
        rootFolders: updateFolder(state.rootFolders),
      }
    }

    case 'SET_FOLDER_CHILDREN': {
      const updateFolder = (folders: FolderNode[]): FolderNode[] =>
        folders.map((folder) =>
          folder.path === action.path
            ? {
                ...folder,
                children: action.children.map((child) => ({
                  ...child,
                  isLoaded: false,
                  isExpanded: false,
                })),
                isLoaded: true,
                isExpanded: true,
              }
            : folder.children
              ? { ...folder, children: updateFolder(folder.children) }
              : folder,
        )

      return {
        ...state,
        rootFolders: updateFolder(state.rootFolders),
      }
    }

    case 'SET_LOADING': {
      const newLoadingPaths = new Set(state.loadingPaths)
      if (action.loading) {
        newLoadingPaths.add(action.path)
      } else {
        newLoadingPaths.delete(action.path)
      }

      return {
        ...state,
        loadingPaths: newLoadingPaths,
      }
    }

    case 'SET_CURRENT_PATH':
      return {
        ...state,
        currentPath: action.path,
      }

    case 'SET_LOADED':
      return {
        ...state,
        isRootFoldersLoaded: action.payload.isLoaded,
      }

    case 'LOAD_TREE_STATE':
      return {
        ...state,
        rootFolders: action.payload.rootFolders,
        currentPath: action.payload.currentPath,
        isRootFoldersLoaded: true,
      }

    case 'LOAD_ROOT_FOLDERS':
      return state // This will be handled by the async action

    case 'SET_HOME_TITLE':
      return {
        ...state,
        homeTitle: action.title,
        isHomeTitleLoaded: true,
      }

    case 'LOAD_HOME_TITLE':
      return state // This will be handled by the async action

    default:
      return state
  }
}

export const folderTreeStore = createStore(initialState, folderTreeReducer)

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
    const state = folderTreeStore.getState()
    const treeState = {
      rootFolders: state.rootFolders,
      currentPath: state.currentPath,
    }
    const treeStateJson = JSON.stringify(treeState)
    await storage?.set(treeStateJson)
  }, saveDelay)
}

/**
 * Initialize folder tree system with storage
 */
export const initializeFolderTreeCache = async (
  configStorage: ConfigStorage,
  debounceDelay: number = 300,
) => {
  storage = configStorage
  saveDelay = debounceDelay

  try {
    const savedTreeState = await storage.get()
    if (savedTreeState) {
      const treeState = JSON.parse(savedTreeState)
      folderTreeStore.dispatch({
        type: 'LOAD_TREE_STATE',
        payload: {
          rootFolders: treeState.rootFolders || [],
          currentPath: treeState.currentPath || '',
        },
      })
    } else {
      folderTreeStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true },
      })
    }
  } catch {
    // Failed to load from storage - continue with empty state
    folderTreeStore.dispatch({
      type: 'SET_LOADED',
      payload: { isLoaded: true },
    })
  }

  // Set up auto-save subscription for tree state changes
  folderTreeStore.subscribe((_, action) => {
    if (
      action.type === 'SET_ROOT_FOLDERS' ||
      action.type === 'EXPAND_FOLDER' ||
      action.type === 'COLLAPSE_FOLDER' ||
      action.type === 'SET_FOLDER_CHILDREN' ||
      action.type === 'SET_CURRENT_PATH'
    ) {
      debouncedSaveToStorage()
    }
  })
}

// Async actions
export const loadRootFolders = async () => {
  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: true })

    const result = await listFiles({
      path: '',
      onlyFolders: true,
    })

    const folders: FolderNode[] = result.items.map((item) => ({
      name: item.name,
      path: item.path,
      isDirectory: item.isDirectory,
      isLoaded: false,
      isExpanded: false,
    }))

    folderTreeStore.dispatch({ type: 'SET_ROOT_FOLDERS', folders })
  } catch {
    // Failed to load root folders - silently continue
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: false })
  }
}

export const loadFolderChildren = async (path: string) => {
  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: true })

    const result = await listFiles({
      path,
      onlyFolders: true,
    })

    const children: FolderNode[] = result.items.map((item) => ({
      name: item.name,
      path: item.path,
      isDirectory: item.isDirectory,
      isLoaded: false,
      isExpanded: false,
    }))

    folderTreeStore.dispatch({ type: 'SET_FOLDER_CHILDREN', path, children })
  } catch {
    // Failed to load folder children - silently continue
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: false })
  }
}

export const loadHomeTitle = async () => {
  try {
    const registry = await getSystemRegistryObject('config.')
    const customTitle = registry['config.home_title']

    if (customTitle && customTitle.trim()) {
      folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title: customTitle.trim() })
    } else {
      folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title: 'Home' })
    }
  } catch {
    // On error, fall back to default
    folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title: 'Home' })
  }
}

export const setHomeTitle = (title: string) => {
  folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title })
}

export const setCurrentPath = (path: string) => {
  folderTreeStore.dispatch({ type: 'SET_CURRENT_PATH', path })
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

  const state = folderTreeStore.getState()
  const treeState = {
    rootFolders: state.rootFolders,
    currentPath: state.currentPath,
  }
  const treeStateJson = JSON.stringify(treeState)
  await storage.set(treeStateJson)
}

/**
 * Cleanup folder tree system
 */
export const cleanup = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  storage = null
}

// Hook to use the folder tree store
export const useFolderTree = () => {
  const state = folderTreeStore.useStore()

  return {
    ...state,
    dispatch: folderTreeStore.dispatch,
    loadRootFolders,
    loadFolderChildren,
    loadHomeTitle,
    setHomeTitle,
    setCurrentPath,
    forceSave,
  }
}
