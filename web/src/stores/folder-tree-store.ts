import { getSpace } from '@/api/org-api'
import { getSystemRegistry } from '@/api/registry-api'
import { listFiles } from '@/api/storage-api'
import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { createStore } from '@/lib/create-store'
import { normalizeDirectoryPath } from '@/lib/path-utils'

export interface FolderNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FolderNode[]
  isLoaded: boolean
  isExpanded: boolean
}

export interface FolderTreeState {
  activeSpaceCacheKey: string
  rootFolders: FolderNode[]
  loadingPaths: Set<string>
  currentPath: string
  isRootFoldersLoaded: boolean
  isHomeTitleLoaded: boolean
  homeTitle: string
  resolvedSpaceCacheKeys: Record<string, string>
  resolvingSpaceKeys: Set<string>
}

export type FolderTreeAction =
  | {
      type: 'SWITCH_SPACE'
      payload: {
        activeSpaceCacheKey: string
        rootFolders: FolderNode[]
        currentPath: string
        homeTitle: string
        isRootFoldersLoaded: boolean
        isHomeTitleLoaded: boolean
      }
    }
  | { type: 'SET_SPACE_RESOLVING'; payload: { spaceKey: string; isResolving: boolean } }
  | { type: 'SET_SPACE_CACHE_KEY'; payload: { spaceKey: string; cacheKey: string } }
  | { type: 'SET_ROOT_FOLDERS'; folders: FolderNode[] }
  | { type: 'EXPAND_FOLDER'; path: string }
  | { type: 'COLLAPSE_FOLDER'; path: string }
  | { type: 'SET_FOLDER_CHILDREN'; path: string; children: FolderNode[]; autoExpand?: boolean }
  | { type: 'UPDATE_TREE_DATA'; path: string; folders: FolderNode[] }
  | { type: 'SET_LOADING'; path: string; loading: boolean }
  | { type: 'SET_CURRENT_PATH'; path: string }
  | { type: 'SET_LOADED'; payload: { isLoaded: boolean } }
  | { type: 'LOAD_TREE_STATE'; payload: { rootFolders: FolderNode[]; currentPath: string } }
  | { type: 'LOAD_ROOT_FOLDERS' }
  | { type: 'SET_HOME_TITLE'; title: string }
  | { type: 'LOAD_HOME_TITLE' }
  | { type: 'INVALIDATE_FOLDER_CACHE'; path: string }

const initialState: FolderTreeState = {
  activeSpaceCacheKey: '__default__',
  rootFolders: [],
  loadingPaths: new Set(),
  currentPath: '',
  isRootFoldersLoaded: false,
  isHomeTitleLoaded: false,
  homeTitle: 'Home',
  resolvedSpaceCacheKeys: {},
  resolvingSpaceKeys: new Set(),
}

interface PersistedFolderTreeState {
  rootFolders: FolderNode[]
  currentPath: string
  homeTitle: string
}

const DEFAULT_SPACE_CACHE_KEY = '__default__'

const getFallbackSpaceCacheKey = (spaceKey?: string) =>
  spaceKey ? `space-key:${spaceKey}` : DEFAULT_SPACE_CACHE_KEY

const getResolvedSpaceCacheKey = (state: FolderTreeState, spaceKey?: string) => {
  if (!spaceKey) {
    return DEFAULT_SPACE_CACHE_KEY
  }

  return state.resolvedSpaceCacheKeys[spaceKey] || getFallbackSpaceCacheKey(spaceKey)
}

const createStateForSpace = (
  activeSpaceCacheKey: string,
  persistedState?: PersistedFolderTreeState,
): FolderTreeState => ({
  activeSpaceCacheKey,
  rootFolders: persistedState?.rootFolders || [],
  loadingPaths: new Set(),
  currentPath: persistedState?.currentPath || '',
  isRootFoldersLoaded: !!persistedState,
  isHomeTitleLoaded: !!persistedState,
  homeTitle: persistedState?.homeTitle || 'Home',
  resolvedSpaceCacheKeys: {},
  resolvingSpaceKeys: new Set(),
})

const getPersistedStateFromFolderTree = (state: FolderTreeState): PersistedFolderTreeState => ({
  rootFolders: state.rootFolders,
  currentPath: state.currentPath,
  homeTitle: state.homeTitle,
})

const isPersistedFolderTreeState = (value: unknown): value is PersistedFolderTreeState => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PersistedFolderTreeState>
  return Array.isArray(candidate.rootFolders) && typeof candidate.currentPath === 'string'
}

const parsePersistedFolderTreeStates = (
  savedValue: string,
): Record<string, PersistedFolderTreeState> => {
  const parsed = JSON.parse(savedValue) as unknown

  if (isPersistedFolderTreeState(parsed)) {
    return {
      [DEFAULT_SPACE_CACHE_KEY]: {
        rootFolders: parsed.rootFolders,
        currentPath: parsed.currentPath,
        homeTitle: parsed.homeTitle || 'Home',
      },
    }
  }

  if (parsed && typeof parsed === 'object' && 'spaces' in parsed) {
    const spaces = (parsed as { spaces?: unknown }).spaces

    if (spaces && typeof spaces === 'object') {
      return Object.fromEntries(
        Object.entries(spaces)
          .filter(([, state]) => isPersistedFolderTreeState(state))
          .map(([cacheKey, state]) => [
            cacheKey,
            {
              rootFolders: state.rootFolders,
              currentPath: state.currentPath,
              homeTitle: state.homeTitle || 'Home',
            },
          ]),
      )
    }
  }

  return {}
}

/**
 * Sort folders alphabetically by name (case-insensitive, natural sort)
 * This ensures consistent ordering regardless of data source
 */
const sortFoldersByName = (folders: FolderNode[]): FolderNode[] => {
  return [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function folderTreeReducer(state: FolderTreeState, action: FolderTreeAction): FolderTreeState {
  switch (action.type) {
    case 'SWITCH_SPACE':
      return {
        ...state,
        activeSpaceCacheKey: action.payload.activeSpaceCacheKey,
        rootFolders: action.payload.rootFolders,
        loadingPaths: new Set(),
        currentPath: action.payload.currentPath,
        isRootFoldersLoaded: action.payload.isRootFoldersLoaded,
        isHomeTitleLoaded: action.payload.isHomeTitleLoaded,
        homeTitle: action.payload.homeTitle,
      }

    case 'SET_SPACE_RESOLVING': {
      const resolvingSpaceKeys = new Set(state.resolvingSpaceKeys)

      if (action.payload.isResolving) {
        resolvingSpaceKeys.add(action.payload.spaceKey)
      } else {
        resolvingSpaceKeys.delete(action.payload.spaceKey)
      }

      return {
        ...state,
        resolvingSpaceKeys,
      }
    }

    case 'SET_SPACE_CACHE_KEY':
      return {
        ...state,
        resolvedSpaceCacheKeys: {
          ...state.resolvedSpaceCacheKeys,
          [action.payload.spaceKey]: action.payload.cacheKey,
        },
      }

    case 'SET_ROOT_FOLDERS':
      return {
        ...state,
        rootFolders: sortFoldersByName(action.folders).map((folder) => {
          // Preserve expanded state from cache if it exists
          const existingFolder = state.rootFolders.find((f) => f.path === folder.path)
          return {
            ...folder,
            isLoaded: existingFolder?.isLoaded || false,
            isExpanded: existingFolder?.isExpanded || false,
            children: existingFolder?.children,
          }
        }),
        isRootFoldersLoaded: true,
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
      // Default to true for backward compatibility
      const shouldExpand = action.autoExpand !== false

      const updateFolder = (folders: FolderNode[]): FolderNode[] =>
        folders.map((folder) =>
          folder.path === action.path
            ? {
                ...folder,
                children: sortFoldersByName(action.children).map((child) => ({
                  ...child,
                  isLoaded: false,
                  isExpanded: false,
                })),
                isLoaded: true,
                isExpanded: shouldExpand,
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

    case 'UPDATE_TREE_DATA': {
      // Handle root level updates
      if (action.path === '' || action.path === 'default') {
        return {
          ...state,
          rootFolders: sortFoldersByName(action.folders).map((newFolder) => {
            // Preserve expanded state and children from existing folder if it exists
            const existingFolder = state.rootFolders.find((f) => f.path === newFolder.path)
            return {
              ...newFolder,
              isLoaded: existingFolder?.isLoaded || false,
              isExpanded: existingFolder?.isExpanded || false,
              children: existingFolder?.children,
            }
          }),
          isRootFoldersLoaded: true,
        }
      }

      // Handle nested folder updates
      const updateFolder = (folders: FolderNode[]): FolderNode[] =>
        folders.map((folder) =>
          folder.path === action.path
            ? {
                ...folder,
                children: sortFoldersByName(action.folders).map((newChild) => {
                  // Preserve expanded state and children from existing child if it exists
                  const existingChild = folder.children?.find((c) => c.path === newChild.path)
                  return {
                    ...newChild,
                    isLoaded: existingChild?.isLoaded || false,
                    isExpanded: existingChild?.isExpanded || false,
                    children: existingChild?.children,
                  }
                }),
                isLoaded: true,
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

    case 'LOAD_TREE_STATE': {
      // Recursively sort all folders in the tree when loading from cache
      const sortTreeRecursively = (folders: FolderNode[]): FolderNode[] => {
        return sortFoldersByName(folders).map((folder) => ({
          ...folder,
          children: folder.children ? sortTreeRecursively(folder.children) : undefined,
        }))
      }

      return {
        ...state,
        rootFolders: sortTreeRecursively(action.payload.rootFolders),
        currentPath: action.payload.currentPath,
        isRootFoldersLoaded: true,
      }
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

    case 'INVALIDATE_FOLDER_CACHE': {
      // Invalidate cache for a specific folder path
      // This clears isLoaded, children, and collapses the folder
      const invalidateFolder = (folders: FolderNode[]): FolderNode[] =>
        folders.map((folder) => {
          if (folder.path === action.path) {
            // Found the folder to invalidate - clear its cache and collapse it
            return {
              ...folder,
              isLoaded: false,
              isExpanded: false,
              children: undefined,
            }
          }
          // Recursively check children
          if (folder.children) {
            return {
              ...folder,
              children: invalidateFolder(folder.children),
            }
          }
          return folder
        })

      return {
        ...state,
        rootFolders: invalidateFolder(state.rootFolders),
      }
    }

    default:
      return state
  }
}

export const folderTreeStore = createStore(initialState, folderTreeReducer)

// Storage management
let storage: ConfigStorage | null = null
let saveTimeout: number | null = null
let saveDelay: number = 300
let persistedTreeStates: Record<string, PersistedFolderTreeState> = {}
let hasStorageSubscription = false

const persistFolderTreeState = (state: FolderTreeState) => {
  persistedTreeStates[state.activeSpaceCacheKey] = getPersistedStateFromFolderTree(state)
}

const ensureResolvedSpaceCacheKey = async (spaceKey?: string) => {
  if (!spaceKey) {
    return DEFAULT_SPACE_CACHE_KEY
  }

  const currentState = folderTreeStore.getState()
  const knownCacheKey = currentState.resolvedSpaceCacheKeys[spaceKey]
  if (knownCacheKey) {
    return knownCacheKey
  }

  if (currentState.resolvingSpaceKeys.has(spaceKey)) {
    const resolvedState = await folderTreeStore.waitFor(
      (state) => !!state.resolvedSpaceCacheKeys[spaceKey],
    )
    return resolvedState.resolvedSpaceCacheKeys[spaceKey]
  }

  folderTreeStore.dispatch({
    type: 'SET_SPACE_RESOLVING',
    payload: { spaceKey, isResolving: true },
  })

  try {
    const space = await getSpace(spaceKey)
    const resolvedCacheKey = space?.id ? `space:${space.id}` : getFallbackSpaceCacheKey(spaceKey)
    folderTreeStore.dispatch({
      type: 'SET_SPACE_CACHE_KEY',
      payload: { spaceKey, cacheKey: resolvedCacheKey },
    })

    const fallbackCacheKey = getFallbackSpaceCacheKey(spaceKey)
    if (resolvedCacheKey !== fallbackCacheKey && persistedTreeStates[fallbackCacheKey]) {
      persistedTreeStates[resolvedCacheKey] = persistedTreeStates[fallbackCacheKey]
      delete persistedTreeStates[fallbackCacheKey]
    }

    return resolvedCacheKey
  } catch {
    const fallbackCacheKey = getFallbackSpaceCacheKey(spaceKey)
    folderTreeStore.dispatch({
      type: 'SET_SPACE_CACHE_KEY',
      payload: { spaceKey, cacheKey: fallbackCacheKey },
    })
    return fallbackCacheKey
  } finally {
    folderTreeStore.dispatch({
      type: 'SET_SPACE_RESOLVING',
      payload: { spaceKey, isResolving: false },
    })
  }
}

const switchFolderTreeSpace = (spaceKey?: string) => {
  const currentState = folderTreeStore.getState()
  const targetSpaceCacheKey = getResolvedSpaceCacheKey(currentState, spaceKey)

  if (currentState.activeSpaceCacheKey === targetSpaceCacheKey) {
    return
  }

  persistFolderTreeState(currentState)

  const nextState = createStateForSpace(
    targetSpaceCacheKey,
    persistedTreeStates[targetSpaceCacheKey],
  )
  folderTreeStore.dispatch({
    type: 'SWITCH_SPACE',
    payload: {
      activeSpaceCacheKey: nextState.activeSpaceCacheKey,
      rootFolders: nextState.rootFolders,
      currentPath: nextState.currentPath,
      homeTitle: nextState.homeTitle,
      isRootFoldersLoaded: nextState.isRootFoldersLoaded,
      isHomeTitleLoaded: nextState.isHomeTitleLoaded,
    },
  })
}

const prepareFolderTreeSpace = async (spaceKey?: string) => {
  if (spaceKey) {
    await ensureResolvedSpaceCacheKey(spaceKey)
  }

  switchFolderTreeSpace(spaceKey)
}

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
    persistFolderTreeState(state)
    const treeStateJson = JSON.stringify({ spaces: persistedTreeStates })
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
      persistedTreeStates = parsePersistedFolderTreeStates(savedTreeState)
      const defaultState = persistedTreeStates[DEFAULT_SPACE_CACHE_KEY]

      if (defaultState) {
        folderTreeStore.dispatch({
          type: 'LOAD_TREE_STATE',
          payload: {
            rootFolders: defaultState.rootFolders || [],
            currentPath: defaultState.currentPath || '',
          },
        })
        folderTreeStore.dispatch({
          type: 'SET_HOME_TITLE',
          title: defaultState.homeTitle || 'Home',
        })
      } else {
        folderTreeStore.dispatch({
          type: 'SET_LOADED',
          payload: { isLoaded: true },
        })
      }
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
  if (!hasStorageSubscription) {
    folderTreeStore.subscribe((state, action) => {
      if (
        action.type === 'SET_ROOT_FOLDERS' ||
        action.type === 'EXPAND_FOLDER' ||
        action.type === 'COLLAPSE_FOLDER' ||
        action.type === 'SET_FOLDER_CHILDREN' ||
        action.type === 'UPDATE_TREE_DATA' ||
        action.type === 'SET_CURRENT_PATH' ||
        action.type === 'SET_HOME_TITLE'
      ) {
        persistFolderTreeState(state)
        debouncedSaveToStorage()
      }
    })
    hasStorageSubscription = true
  }
}

// Async actions
export const loadRootFolders = async (spaceKey?: string) => {
  await prepareFolderTreeSpace(spaceKey)

  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: true })

    const result = await listFiles({
      path: '',
      spaceKey,
      onlyFolders: true,
      sortBy: 'NAME',
      sortOrder: 'ASC',
    })

    const folders: FolderNode[] = result.items.map((item) => ({
      name: item.name,
      path: normalizeDirectoryPath(item.path),
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

export const loadFolderChildren = async (
  path: string,
  autoExpand: boolean = true,
  spaceKey?: string,
) => {
  await prepareFolderTreeSpace(spaceKey)

  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: true })

    const result = await listFiles({
      path,
      spaceKey,
      onlyFolders: true,
      sortBy: 'NAME',
      sortOrder: 'ASC',
    })

    const children: FolderNode[] = result.items.map((item) => ({
      name: item.name,
      path: normalizeDirectoryPath(item.path),
      isDirectory: item.isDirectory,
      children: [], // Initialize with empty array - will be populated when folder is expanded
      isLoaded: false,
      isExpanded: false,
    }))

    folderTreeStore.dispatch({ type: 'SET_FOLDER_CHILDREN', path, children, autoExpand })
  } catch {
    // Failed to load folder children - silently continue
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: false })
  }
}

export const loadHomeTitle = async (spaceKey?: string) => {
  await prepareFolderTreeSpace(spaceKey)

  if (spaceKey) {
    try {
      const space = await getSpace(spaceKey)
      const spaceName = space?.name?.trim()

      folderTreeStore.dispatch({
        type: 'SET_HOME_TITLE',
        title: spaceName || 'Home',
      })
      return
    } catch {
      folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title: 'Home' })
      return
    }
  }

  try {
    const registry = await getSystemRegistry('config.app_home_title')
    const customTitle = registry[0]?.value

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

export const setCurrentPath = (path: string, spaceKey?: string) => {
  const currentState = folderTreeStore.getState()
  const targetSpaceCacheKey = getResolvedSpaceCacheKey(currentState, spaceKey)

  if (currentState.activeSpaceCacheKey !== targetSpaceCacheKey) {
    switchFolderTreeSpace(spaceKey)
  }

  folderTreeStore.dispatch({ type: 'SET_CURRENT_PATH', path })
}

export const updateTreeData = (path: string, folders: FolderNode[]) => {
  folderTreeStore.dispatch({ type: 'UPDATE_TREE_DATA', path, folders })
}

/**
 * Invalidate cache for a specific folder path
 * This clears the isLoaded flag and children for the specified folder,
 * forcing it to re-fetch when next expanded
 */
export const invalidateFolderCache = (path: string) => {
  folderTreeStore.dispatch({ type: 'INVALIDATE_FOLDER_CACHE', path })
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
  persistFolderTreeState(state)
  const treeStateJson = JSON.stringify({ spaces: persistedTreeStates })
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
  persistedTreeStates = {}
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
