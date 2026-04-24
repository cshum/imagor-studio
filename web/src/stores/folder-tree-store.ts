import { getSpace } from '@/api/org-api'
import { getSystemRegistry } from '@/api/registry-api'
import { listFiles } from '@/api/storage-api'
import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage'
import { createStore } from '@/lib/create-store'
import { createLatestRequestTracker } from '@/lib/latest-request-tracker'
import { normalizeScopedDirectoryPath } from '@/lib/path-utils'

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

export interface FolderTreeSpaceIdentity {
  spaceKey?: string
  spaceID?: string
  spaceName?: string
}

type FolderTreeSpaceInput = FolderTreeSpaceIdentity | string | undefined

const normalizeFolderTreeSpace = (
  space?: FolderTreeSpaceInput,
): FolderTreeSpaceIdentity | undefined => (typeof space === 'string' ? { spaceKey: space } : space)

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

const getSpaceIDFromCacheKey = (cacheKey: string): string | undefined => {
  if (!cacheKey.startsWith('space:')) {
    return undefined
  }

  return cacheKey.slice('space:'.length) || undefined
}

const normalizePersistedFolderNodes = (folders: FolderNode[], spaceID?: string): FolderNode[] =>
  folders.map((folder) => ({
    ...folder,
    path: normalizeScopedDirectoryPath(folder.path, spaceID),
    children: folder.children ? normalizePersistedFolderNodes(folder.children, spaceID) : undefined,
  }))

const getResolvedSpaceCacheKey = (state: FolderTreeState, space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  if (!normalizedSpace?.spaceKey) {
    return DEFAULT_SPACE_CACHE_KEY
  }

  return (
    state.resolvedSpaceCacheKeys[normalizedSpace.spaceKey] ||
    getFallbackSpaceCacheKey(normalizedSpace.spaceKey)
  )
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

const normalizePersistedFolderTreeState = (
  state: PersistedFolderTreeState,
  cacheKey: string = DEFAULT_SPACE_CACHE_KEY,
): PersistedFolderTreeState => ({
  rootFolders: normalizePersistedFolderNodes(state.rootFolders, getSpaceIDFromCacheKey(cacheKey)),
  currentPath: normalizeScopedDirectoryPath(state.currentPath, getSpaceIDFromCacheKey(cacheKey)),
  homeTitle: state.homeTitle || 'Home',
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
      [DEFAULT_SPACE_CACHE_KEY]: normalizePersistedFolderTreeState(parsed, DEFAULT_SPACE_CACHE_KEY),
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
            normalizePersistedFolderTreeState(state, cacheKey),
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

const sortTreeRecursively = (folders: FolderNode[]): FolderNode[] =>
  sortFoldersByName(folders).map((folder) => ({
    ...folder,
    children: folder.children ? sortTreeRecursively(folder.children) : undefined,
  }))

const mergeFolderUiState = (folder: FolderNode, existingFolder?: FolderNode): FolderNode => ({
  ...folder,
  isLoaded: existingFolder?.isLoaded || false,
  isExpanded: existingFolder?.isExpanded || false,
  children: existingFolder?.children,
})

const mergeFoldersPreservingState = (
  nextFolders: FolderNode[],
  existingFolders: FolderNode[],
): FolderNode[] =>
  sortFoldersByName(nextFolders).map((folder) => {
    const existingFolder = existingFolders.find((item) => item.path === folder.path)
    return mergeFolderUiState(folder, existingFolder)
  })

const updateFolderTreeAtPath = (
  folders: FolderNode[],
  path: string,
  updateFolder: (folder: FolderNode) => FolderNode,
): FolderNode[] =>
  folders.map((folder) =>
    folder.path === path
      ? updateFolder(folder)
      : folder.children
        ? { ...folder, children: updateFolderTreeAtPath(folder.children, path, updateFolder) }
        : folder,
  )

const applyTreeDataToRootFolders = (
  currentRootFolders: FolderNode[],
  path: string,
  folders: FolderNode[],
): FolderNode[] => {
  if (path === '' || path === 'default') {
    return mergeFoldersPreservingState(folders, currentRootFolders)
  }

  return updateFolderTreeAtPath(currentRootFolders, path, (folder) => ({
    ...folder,
    children: mergeFoldersPreservingState(folders, folder.children || []),
    isLoaded: true,
  }))
}

const getPersistedStateForCacheKey = (cacheKey: string): PersistedFolderTreeState =>
  persistedTreeStates[cacheKey] ||
  normalizePersistedFolderTreeState({
    rootFolders: [],
    currentPath: '',
    homeTitle: 'Home',
  })

const isSpaceReady = (state: FolderTreeState, targetCacheKey: string, spaceKey?: string) =>
  state.activeSpaceCacheKey === targetCacheKey &&
  state.isRootFoldersLoaded &&
  state.isHomeTitleLoaded &&
  !state.loadingPaths.has('') &&
  (!spaceKey || !state.resolvingSpaceKeys.has(spaceKey))

const applyToSpaceState = (
  targetCacheKey: string,
  applyToActiveState: () => void,
  applyToPersistedState: (state: PersistedFolderTreeState) => PersistedFolderTreeState,
) => {
  const currentState = folderTreeStore.getState()

  if (currentState.activeSpaceCacheKey === targetCacheKey) {
    applyToActiveState()
    return
  }

  const persistedState = getPersistedStateForCacheKey(targetCacheKey)
  persistedTreeStates[targetCacheKey] = applyToPersistedState(persistedState)
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
        rootFolders: mergeFoldersPreservingState(action.folders, state.rootFolders),
        isRootFoldersLoaded: true,
      }

    case 'EXPAND_FOLDER': {
      return {
        ...state,
        rootFolders: updateFolderTreeAtPath(state.rootFolders, action.path, (folder) => ({
          ...folder,
          isExpanded: true,
        })),
      }
    }

    case 'COLLAPSE_FOLDER': {
      return {
        ...state,
        rootFolders: updateFolderTreeAtPath(state.rootFolders, action.path, (folder) => ({
          ...folder,
          isExpanded: false,
        })),
      }
    }

    case 'SET_FOLDER_CHILDREN': {
      // Default to true for backward compatibility
      const shouldExpand = action.autoExpand !== false

      return {
        ...state,
        rootFolders: updateFolderTreeAtPath(state.rootFolders, action.path, (folder) => ({
          ...folder,
          children: sortFoldersByName(action.children).map((child) => ({
            ...child,
            isLoaded: false,
            isExpanded: false,
          })),
          isLoaded: true,
          isExpanded: shouldExpand,
        })),
      }
    }

    case 'UPDATE_TREE_DATA': {
      // Handle root level updates
      if (action.path === '' || action.path === 'default') {
        return {
          ...state,
          rootFolders: mergeFoldersPreservingState(action.folders, state.rootFolders),
          isRootFoldersLoaded: true,
        }
      }

      return {
        ...state,
        rootFolders: updateFolderTreeAtPath(state.rootFolders, action.path, (folder) => ({
          ...folder,
          children: mergeFoldersPreservingState(action.folders, folder.children || []),
          isLoaded: true,
        })),
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
      return {
        ...state,
        rootFolders: updateFolderTreeAtPath(state.rootFolders, action.path, (folder) => ({
          ...folder,
          isLoaded: false,
          isExpanded: false,
          children: undefined,
        })),
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
let persistedSpaceCacheKeys = new Set<string>()
let initializationPromise: Promise<void> = Promise.resolve()
const folderTreeReadyPromises = new Map<string, Promise<void>>()
const latestRootLoadRequests = createLatestRequestTracker()
const latestFolderChildrenRequests = createLatestRequestTracker()
const latestHomeTitleRequests = createLatestRequestTracker()

const isSessionConfigStorage = (value: ConfigStorage | null): value is SessionConfigStorage =>
  value instanceof SessionConfigStorage

const getSpaceIndexStorage = () => {
  if (!isSessionConfigStorage(storage)) {
    return null
  }

  return new SessionConfigStorage(`${storage.storageKey}:space-index`)
}

const getStorageForCacheKey = (cacheKey: string) => {
  if (cacheKey === DEFAULT_SPACE_CACHE_KEY) {
    return storage
  }

  if (!isSessionConfigStorage(storage)) {
    return storage
  }

  return new SessionConfigStorage(`${storage.storageKey}:${cacheKey}`)
}

const rememberPersistedSpaceCacheKey = (cacheKey: string) => {
  if (cacheKey !== DEFAULT_SPACE_CACHE_KEY) {
    persistedSpaceCacheKeys.add(cacheKey)
  }
}

const forgetPersistedSpaceCacheKey = (cacheKey: string) => {
  if (cacheKey !== DEFAULT_SPACE_CACHE_KEY) {
    persistedSpaceCacheKeys.delete(cacheKey)
  }
}

const saveSpaceCacheIndex = async () => {
  const indexStorage = getSpaceIndexStorage()

  if (!indexStorage) {
    return
  }

  await indexStorage.set(JSON.stringify(Array.from(persistedSpaceCacheKeys)))
}

const savePersistedState = async (cacheKey: string, state: PersistedFolderTreeState) => {
  const targetStorage = getStorageForCacheKey(cacheKey)

  if (!targetStorage) {
    return
  }

  await targetStorage.set(JSON.stringify(state))
  rememberPersistedSpaceCacheKey(cacheKey)

  if (cacheKey !== DEFAULT_SPACE_CACHE_KEY) {
    await saveSpaceCacheIndex()
  }
}

const loadPersistedState = async (cacheKey: string) => {
  const targetStorage = getStorageForCacheKey(cacheKey)

  if (!targetStorage) {
    return null
  }

  const savedValue = await targetStorage.get()
  if (!savedValue) {
    return null
  }

  try {
    const parsed = JSON.parse(savedValue) as unknown
    if (isPersistedFolderTreeState(parsed)) {
      return normalizePersistedFolderTreeState(parsed, cacheKey)
    }
  } catch {
    return null
  }

  const parsedStates = parsePersistedFolderTreeStates(savedValue)
  return parsedStates[cacheKey] || null
}

const hydrateLegacyPersistedTreeStates = (states: Record<string, PersistedFolderTreeState>) => {
  persistedTreeStates = states

  for (const cacheKey of Object.keys(states)) {
    rememberPersistedSpaceCacheKey(cacheKey)
  }
}

const hydrateIndexedPersistedTreeStates = async () => {
  const defaultState = await loadPersistedState(DEFAULT_SPACE_CACHE_KEY)
  if (defaultState) {
    persistedTreeStates[DEFAULT_SPACE_CACHE_KEY] = defaultState
  }

  const indexStorage = getSpaceIndexStorage()
  if (!indexStorage) {
    return
  }

  const rawIndex = await indexStorage.get()
  if (!rawIndex) {
    return
  }

  try {
    const cacheKeys = JSON.parse(rawIndex) as unknown
    if (!Array.isArray(cacheKeys)) {
      return
    }

    for (const cacheKey of cacheKeys) {
      if (typeof cacheKey !== 'string') {
        continue
      }

      const persistedState = await loadPersistedState(cacheKey)
      if (persistedState) {
        persistedTreeStates[cacheKey] = persistedState
        rememberPersistedSpaceCacheKey(cacheKey)
      }
    }
  } catch {
    // Ignore malformed index values and continue with any states we already loaded.
  }
}

const persistFolderTreeState = (state: FolderTreeState) => {
  persistedTreeStates[state.activeSpaceCacheKey] = getPersistedStateFromFolderTree(state)
  rememberPersistedSpaceCacheKey(state.activeSpaceCacheKey)
}

const ensureResolvedSpaceCacheKey = async (space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)

  if (!normalizedSpace?.spaceKey) {
    return DEFAULT_SPACE_CACHE_KEY
  }

  const currentState = folderTreeStore.getState()
  const knownCacheKey = currentState.resolvedSpaceCacheKeys[normalizedSpace.spaceKey]
  if (knownCacheKey) {
    return knownCacheKey
  }

  const applyResolvedCacheKey = (resolvedCacheKey: string) => {
    folderTreeStore.dispatch({
      type: 'SET_SPACE_CACHE_KEY',
      payload: { spaceKey: normalizedSpace.spaceKey!, cacheKey: resolvedCacheKey },
    })

    const fallbackCacheKey = getFallbackSpaceCacheKey(normalizedSpace.spaceKey)
    if (resolvedCacheKey !== fallbackCacheKey && persistedTreeStates[fallbackCacheKey]) {
      if (!persistedTreeStates[resolvedCacheKey]) {
        persistedTreeStates[resolvedCacheKey] = normalizePersistedFolderTreeState(
          persistedTreeStates[fallbackCacheKey],
          resolvedCacheKey,
        )
      }
      delete persistedTreeStates[fallbackCacheKey]
      rememberPersistedSpaceCacheKey(resolvedCacheKey)
      forgetPersistedSpaceCacheKey(fallbackCacheKey)
    }
  }

  if (normalizedSpace.spaceID) {
    const resolvedCacheKey = `space:${normalizedSpace.spaceID}`
    applyResolvedCacheKey(resolvedCacheKey)
    return resolvedCacheKey
  }

  if (currentState.resolvingSpaceKeys.has(normalizedSpace.spaceKey)) {
    const resolvedState = await folderTreeStore.waitFor(
      (state) => !!state.resolvedSpaceCacheKeys[normalizedSpace.spaceKey!],
    )
    return resolvedState.resolvedSpaceCacheKeys[normalizedSpace.spaceKey]
  }

  folderTreeStore.dispatch({
    type: 'SET_SPACE_RESOLVING',
    payload: { spaceKey: normalizedSpace.spaceKey, isResolving: true },
  })

  try {
    const resolvedSpace = await getSpace(normalizedSpace.spaceKey)
    const resolvedCacheKey = resolvedSpace?.id
      ? `space:${resolvedSpace.id}`
      : getFallbackSpaceCacheKey(normalizedSpace.spaceKey)
    applyResolvedCacheKey(resolvedCacheKey)

    return resolvedCacheKey
  } catch {
    const fallbackCacheKey = getFallbackSpaceCacheKey(normalizedSpace.spaceKey)
    folderTreeStore.dispatch({
      type: 'SET_SPACE_CACHE_KEY',
      payload: { spaceKey: normalizedSpace.spaceKey, cacheKey: fallbackCacheKey },
    })
    return fallbackCacheKey
  } finally {
    folderTreeStore.dispatch({
      type: 'SET_SPACE_RESOLVING',
      payload: { spaceKey: normalizedSpace.spaceKey, isResolving: false },
    })
  }
}

const switchFolderTreeSpace = (space?: FolderTreeSpaceInput) => {
  const currentState = folderTreeStore.getState()
  const targetSpaceCacheKey = getResolvedSpaceCacheKey(currentState, space)

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

const prepareFolderTreeSpace = async (space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  await initializationPromise

  if (normalizedSpace?.spaceKey) {
    await ensureResolvedSpaceCacheKey(normalizedSpace)
  }

  switchFolderTreeSpace(normalizedSpace)
}

const prepareFolderTreeTarget = async (space?: FolderTreeSpaceInput) => {
  await prepareFolderTreeSpace(space)

  const currentState = folderTreeStore.getState()

  return {
    currentState,
    targetCacheKey: getResolvedSpaceCacheKey(currentState, space),
  }
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
    await savePersistedState(state.activeSpaceCacheKey, getPersistedStateFromFolderTree(state))
  }, saveDelay)
}

/**
 * Initialize folder tree system with storage
 */
export const initializeFolderTreeCache = async (
  configStorage: ConfigStorage,
  debounceDelay: number = 300,
) => {
  initializationPromise = (async () => {
    storage = configStorage
    saveDelay = debounceDelay
    persistedTreeStates = {}
    persistedSpaceCacheKeys = new Set<string>()

    try {
      const savedTreeState = await storage.get()
      if (savedTreeState) {
        const parsedStates = parsePersistedFolderTreeStates(savedTreeState)

        if (Object.keys(parsedStates).length > 1 || savedTreeState.includes('"spaces"')) {
          hydrateLegacyPersistedTreeStates(parsedStates)
        } else {
          await hydrateIndexedPersistedTreeStates()

          if (parsedStates[DEFAULT_SPACE_CACHE_KEY]) {
            persistedTreeStates[DEFAULT_SPACE_CACHE_KEY] = parsedStates[DEFAULT_SPACE_CACHE_KEY]
          }
        }
      } else {
        await hydrateIndexedPersistedTreeStates()
      }

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
    } catch {
      // Failed to load from storage - continue with empty state
      folderTreeStore.dispatch({
        type: 'SET_LOADED',
        payload: { isLoaded: true },
      })
    }
  })()

  await initializationPromise

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
export const loadRootFolders = async (space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  const { targetCacheKey } = await prepareFolderTreeTarget(space)
  const requestGeneration = latestRootLoadRequests.begin(targetCacheKey)

  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: true })

    const result = await listFiles({
      path: '',
      spaceID: normalizedSpace?.spaceID,
      onlyFolders: true,
      sortBy: 'NAME',
      sortOrder: 'ASC',
    })

    const folders: FolderNode[] = result.items.map((item) => ({
      name: item.name,
      path: normalizeScopedDirectoryPath(item.path, normalizedSpace?.spaceID),
      isDirectory: item.isDirectory,
      isLoaded: false,
      isExpanded: false,
    }))

    if (!latestRootLoadRequests.isLatest(targetCacheKey, requestGeneration)) {
      return
    }

    applyToSpaceState(
      targetCacheKey,
      () => {
        folderTreeStore.dispatch({ type: 'SET_ROOT_FOLDERS', folders })
      },
      (persistedState) => ({
        ...persistedState,
        rootFolders: mergeFoldersPreservingState(folders, persistedState.rootFolders),
      }),
    )
  } catch {
    // Failed to load root folders - silently continue
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: false })
  }
}

export const loadFolderChildren = async (
  path: string,
  autoExpand: boolean = true,
  space?: FolderTreeSpaceInput,
) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  const { targetCacheKey } = await prepareFolderTreeTarget(space)
  const requestKey = `${targetCacheKey}:${path}`
  const requestGeneration = latestFolderChildrenRequests.begin(requestKey)

  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: true })

    const result = await listFiles({
      path,
      spaceID: normalizedSpace?.spaceID,
      onlyFolders: true,
      sortBy: 'NAME',
      sortOrder: 'ASC',
    })

    const children: FolderNode[] = result.items.map((item) => ({
      name: item.name,
      path: normalizeScopedDirectoryPath(item.path, normalizedSpace?.spaceID),
      isDirectory: item.isDirectory,
      children: [], // Initialize with empty array - will be populated when folder is expanded
      isLoaded: false,
      isExpanded: false,
    }))

    if (!latestFolderChildrenRequests.isLatest(requestKey, requestGeneration)) {
      return
    }

    applyToSpaceState(
      targetCacheKey,
      () => {
        folderTreeStore.dispatch({ type: 'SET_FOLDER_CHILDREN', path, children, autoExpand })
      },
      (persistedState) => ({
        ...persistedState,
        rootFolders: updateFolderTreeAtPath(persistedState.rootFolders, path, (folder) => ({
          ...folder,
          children: sortFoldersByName(children).map((child) => ({
            ...child,
            isLoaded: false,
            isExpanded: false,
          })),
          isLoaded: true,
          isExpanded: autoExpand !== false,
        })),
      }),
    )
  } catch {
    // Failed to load folder children - silently continue
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: false })
  }
}

export const loadHomeTitle = async (space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  const { targetCacheKey } = await prepareFolderTreeTarget(space)
  const requestGeneration = latestHomeTitleRequests.begin(targetCacheKey)

  const applyHomeTitle = (title: string) => {
    if (!latestHomeTitleRequests.isLatest(targetCacheKey, requestGeneration)) {
      return
    }

    applyToSpaceState(
      targetCacheKey,
      () => {
        folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title })
      },
      (persistedState) => ({
        ...persistedState,
        homeTitle: title,
      }),
    )
  }

  if (normalizedSpace?.spaceKey) {
    if (normalizedSpace.spaceName?.trim()) {
      applyHomeTitle(normalizedSpace.spaceName.trim())
      return
    }

    try {
      const resolvedSpace = await getSpace(normalizedSpace.spaceKey)
      const spaceName = resolvedSpace?.name?.trim()

      applyHomeTitle(spaceName || 'Home')
      return
    } catch {
      applyHomeTitle('Home')
      return
    }
  }

  try {
    const registry = await getSystemRegistry('config.app_home_title')
    const customTitle = registry[0]?.value

    if (customTitle && customTitle.trim()) {
      applyHomeTitle(customTitle.trim())
    } else {
      applyHomeTitle('Home')
    }
  } catch {
    // On error, fall back to default
    applyHomeTitle('Home')
  }
}

export const ensureFolderTreeReady = async (space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  const { currentState, targetCacheKey } = await prepareFolderTreeTarget(space)

  if (isSpaceReady(currentState, targetCacheKey, normalizedSpace?.spaceKey)) {
    return
  }

  const existingPromise = folderTreeReadyPromises.get(targetCacheKey)
  if (existingPromise) {
    await existingPromise
    return
  }

  const readyPromise = (async () => {
    const stateBeforeLoad = folderTreeStore.getState()
    const loadOperations: Promise<void>[] = []

    if (!stateBeforeLoad.isRootFoldersLoaded && !stateBeforeLoad.loadingPaths.has('')) {
      loadOperations.push(loadRootFolders(normalizedSpace))
    }

    if (!stateBeforeLoad.isHomeTitleLoaded) {
      loadOperations.push(loadHomeTitle(normalizedSpace))
    }

    if (loadOperations.length > 0) {
      await Promise.all(loadOperations)
    }

    await folderTreeStore.waitFor((state) =>
      isSpaceReady(state, targetCacheKey, normalizedSpace?.spaceKey),
    )
  })()

  folderTreeReadyPromises.set(targetCacheKey, readyPromise)

  try {
    await readyPromise
  } finally {
    folderTreeReadyPromises.delete(targetCacheKey)
  }
}

export const setHomeTitle = (title: string) => {
  folderTreeStore.dispatch({ type: 'SET_HOME_TITLE', title })
}

export const setCurrentPath = async (path: string, space?: FolderTreeSpaceInput) => {
  const normalizedSpace = normalizeFolderTreeSpace(space)
  await ensureFolderTreeReady(normalizedSpace)

  const currentState = folderTreeStore.getState()
  const targetSpaceCacheKey = getResolvedSpaceCacheKey(currentState, normalizedSpace)

  if (currentState.activeSpaceCacheKey !== targetSpaceCacheKey) {
    switchFolderTreeSpace(normalizedSpace)
  }

  folderTreeStore.dispatch({ type: 'SET_CURRENT_PATH', path })
}

export const updateTreeData = async (
  path: string,
  folders: FolderNode[],
  space?: FolderTreeSpaceInput,
) => {
  await initializationPromise

  const normalizedSpace = normalizeFolderTreeSpace(space)

  if (normalizedSpace?.spaceKey) {
    await ensureResolvedSpaceCacheKey(normalizedSpace)
  }

  const currentState = folderTreeStore.getState()
  const targetCacheKey = getResolvedSpaceCacheKey(currentState, normalizedSpace)

  applyToSpaceState(
    targetCacheKey,
    () => {
      folderTreeStore.dispatch({ type: 'UPDATE_TREE_DATA', path, folders })
    },
    (persistedState) => ({
      ...persistedState,
      rootFolders: applyTreeDataToRootFolders(persistedState.rootFolders, path, folders),
    }),
  )
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
  await savePersistedState(state.activeSpaceCacheKey, getPersistedStateFromFolderTree(state))
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
  persistedSpaceCacheKeys = new Set<string>()
  initializationPromise = Promise.resolve()
  folderTreeReadyPromises.clear()
  latestRootLoadRequests.clear()
  latestFolderChildrenRequests.clear()
  latestHomeTitleRequests.clear()
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
    ensureFolderTreeReady,
    setHomeTitle,
    setCurrentPath,
    forceSave,
  }
}
