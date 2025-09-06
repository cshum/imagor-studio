import { listFiles } from '@/api/storage-api'
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
}

export type FolderTreeAction =
  | { type: 'SET_ROOT_FOLDERS'; folders: FolderNode[] }
  | { type: 'EXPAND_FOLDER'; path: string }
  | { type: 'COLLAPSE_FOLDER'; path: string }
  | { type: 'SET_FOLDER_CHILDREN'; path: string; children: FolderNode[] }
  | { type: 'SET_LOADING'; path: string; loading: boolean }
  | { type: 'SET_CURRENT_PATH'; path: string }
  | { type: 'LOAD_ROOT_FOLDERS' }

const initialState: FolderTreeState = {
  rootFolders: [],
  loadingPaths: new Set(),
  currentPath: '',
}

function folderTreeReducer(state: FolderTreeState, action: FolderTreeAction): FolderTreeState {
  switch (action.type) {
    case 'SET_ROOT_FOLDERS':
      return {
        ...state,
        rootFolders: action.folders.map((folder) => ({
          ...folder,
          isLoaded: false,
          isExpanded: false,
        })),
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

    case 'LOAD_ROOT_FOLDERS':
      return state // This will be handled by the async action

    default:
      return state
  }
}

export const folderTreeStore = createStore(initialState, folderTreeReducer)

// Async actions
export const loadRootFolders = async () => {
  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: true })

    const result = await listFiles({
      path: '',
      offset: 0,
      limit: 0,
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
  } catch (error) {
    console.error('Failed to load root folders:', error)
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path: '', loading: false })
  }
}

export const loadFolderChildren = async (path: string) => {
  try {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: true })

    const result = await listFiles({
      path,
      offset: 0,
      limit: 0,
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
  } catch (error) {
    console.error(`Failed to load children for ${path}:`, error)
  } finally {
    folderTreeStore.dispatch({ type: 'SET_LOADING', path, loading: false })
  }
}

// Hook to use the folder tree store
export const useFolderTree = () => {
  const state = folderTreeStore.useStore()

  return {
    ...state,
    dispatch: folderTreeStore.dispatch,
    loadRootFolders,
    loadFolderChildren,
  }
}
