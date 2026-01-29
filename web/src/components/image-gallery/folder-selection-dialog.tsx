import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderPlus } from 'lucide-react'

import { FolderNode, FolderPickerNode } from '@/components/image-gallery/folder-picker-node'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  invalidateFolderCache,
  loadFolderChildren,
  loadRootFolders,
  useFolderTree,
} from '@/stores/folder-tree-store'

export interface FolderSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPath: string | null
  onSelect: (path: string) => void
  excludePaths?: string[]
  currentPath?: string
  showNewFolderButton?: boolean
  onCreateFolder?: (selectedPath: string | null) => void
  onFolderCreated?: (callback: (folderPath: string) => void) => void
  // Customization props for reusability
  title?: string
  description?: string
  confirmButtonText?: string
  itemCount?: number
}

export const FolderSelectionDialog: React.FC<FolderSelectionDialogProps> = ({
  open,
  onOpenChange,
  selectedPath: initialSelectedPath,
  onSelect,
  excludePaths = [],
  currentPath,
  showNewFolderButton = false,
  onCreateFolder,
  onFolderCreated,
  title,
  description,
  confirmButtonText,
  itemCount,
}) => {
  const { t } = useTranslation()
  const { homeTitle, rootFolders } = useFolderTree()

  // Generate title with item count if provided
  const dialogTitle = title || t('pages.gallery.moveItems.selectDestination')
  const displayTitle = itemCount ? `${dialogTitle} (${itemCount})` : dialogTitle
  const dialogDescription = description || t('pages.gallery.moveItems.selectDestinationDescription')
  const buttonText = confirmButtonText || t('pages.gallery.moveItems.select')

  // Local state for picker-specific expand state (separate from sidebar)
  const [localExpandState, setLocalExpandState] = useState<Record<string, boolean>>({})
  const [selectedPath, setSelectedPath] = useState<string | null>(initialSelectedPath)
  const [isLoading, setIsLoading] = useState(false)
  const [excludePathsSet] = useState(() => new Set(excludePaths))

  // Build tree with local expand state overlaid on store data
  const buildTreeWithLocalExpand = useCallback(
    (storeFolders: FolderNode[]): FolderNode[] => {
      return storeFolders.map((folder) => ({
        ...folder,
        isExpanded: localExpandState[folder.path] ?? false,
        children: folder.children ? buildTreeWithLocalExpand(folder.children) : undefined,
      }))
    },
    [localExpandState],
  )

  // Create tree structure with root folder
  const tree: FolderNode[] = React.useMemo(() => {
    if (rootFolders.length === 0) return []

    return [
      {
        name: homeTitle,
        path: '',
        isDirectory: true,
        isLoaded: true,
        isExpanded: localExpandState[''] ?? true,
        children: buildTreeWithLocalExpand(rootFolders),
      },
    ]
  }, [rootFolders, homeTitle, localExpandState, buildTreeWithLocalExpand])

  const updateNode = useCallback((path: string, updates: Partial<FolderNode>) => {
    // Only update local expand state - data comes from store
    if ('isExpanded' in updates) {
      setLocalExpandState((prev) => ({
        ...prev,
        [path]: updates.isExpanded!,
      }))
    }
  }, [])

  // Auto-expand folders to reveal the current path
  const expandToPath = useCallback(async (targetPath: string) => {
    if (!targetPath) return

    // Split path into segments (e.g., "folder1/folder2/folder3" -> ["folder1", "folder2", "folder3"])
    const segments = targetPath.split('/').filter(Boolean)

    // Expand each parent folder sequentially
    let currentPath = ''
    const expandStates: Record<string, boolean> = { '': true } // Expand root

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      // Load folder children using store
      try {
        await loadFolderChildren(currentPath, false) // Don't auto-expand in store
        expandStates[currentPath] = true

        // Small delay to allow state to update
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`Failed to load folder: ${currentPath}`, error)
        break
      }
    }

    // Update all expand states at once
    setLocalExpandState((prev) => ({ ...prev, ...expandStates }))
  }, [])

  // Handle folder creation - refresh the parent folder in the store
  const handleFolderCreatedCallback = useCallback(
    async (folderPath: string) => {
      // Get parent path
      const pathParts = folderPath.split('/').filter(Boolean)
      pathParts.pop() // Remove the new folder name
      const parentPath = pathParts.join('/')

      // Invalidate and reload the parent folder's children in the store
      invalidateFolderCache(parentPath)
      await loadFolderChildren(parentPath, false) // Don't auto-expand in store

      // Expand the parent in local state
      setLocalExpandState((prev) => ({
        ...prev,
        [parentPath]: true,
      }))

      // Auto-select the newly created folder
      setSelectedPath(folderPath)

      // Expand to show the new folder path (in case it's nested)
      await expandToPath(folderPath)
    },
    [expandToPath],
  )

  // Load root folders when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPath(initialSelectedPath)

      // Load root folders if not already loaded
      const loadData = async () => {
        setIsLoading(true)
        try {
          await loadRootFolders()

          // Auto-expand to show current path
          if (currentPath) {
            await expandToPath(currentPath)

            // Scroll to the current folder after expansion
            setTimeout(() => {
              const element = document.querySelector(`[data-folder-path="${currentPath}"]`)
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }, 150)
          } else {
            // Expand root by default
            setLocalExpandState((prev) => ({ ...prev, '': true }))
          }
        } finally {
          setIsLoading(false)
        }
      }

      loadData()
    }
  }, [open, currentPath, initialSelectedPath, expandToPath])

  // Call the onFolderCreated callback when provided
  useEffect(() => {
    if (onFolderCreated) {
      onFolderCreated(handleFolderCreatedCallback)
    }
  }, [onFolderCreated, handleFolderCreatedCallback])

  const handleSelect = () => {
    if (selectedPath !== null) {
      onSelect(selectedPath)
      onOpenChange(false)
    }
  }

  const handleCreateFolder = () => {
    // Call the create folder handler with the currently selected path
    onCreateFolder?.(selectedPath)

    // Invalidate the folder tree cache for the selected path to force refresh
    // This ensures the new folder appears in the sidebar tree
    if (selectedPath) {
      invalidateFolderCache(selectedPath)
    } else {
      // If at root, invalidate root by reloading
      invalidateFolderCache('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-sm md:w-lg'>
        <DialogHeader>
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div>
          <ScrollArea className='border-muted h-96 w-full max-w-[340px] overflow-x-hidden rounded-md border md:max-w-[460px] [&>div>div]:!block [&>div>div]:!min-w-0'>
            {isLoading ? (
              <div className='flex h-full items-center justify-center'>
                <div className='text-muted-foreground text-sm'>{t('common.status.loading')}</div>
              </div>
            ) : tree.length === 0 ? (
              <div className='flex h-full items-center justify-center'>
                <div className='text-muted-foreground text-sm'>
                  {t('components.folderTree.noFoldersFound')}
                </div>
              </div>
            ) : (
              <div className='w-full min-w-0 space-y-0.5 p-2'>
                {tree.map((folder) => (
                  <FolderPickerNode
                    key={folder.path}
                    folder={folder}
                    selectedPath={selectedPath}
                    excludePaths={excludePathsSet}
                    onSelect={setSelectedPath}
                    onUpdateNode={updateNode}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className='flex-row justify-between sm:justify-between'>
          {showNewFolderButton && onCreateFolder && (
            <Button variant='outline' onClick={handleCreateFolder} className='gap-2'>
              <FolderPlus className='h-4 w-4' />
              {t('pages.gallery.createFolder.newFolder')}
            </Button>
          )}
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleSelect} disabled={selectedPath === null}>
              {buttonText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
