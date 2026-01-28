import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderPlus } from 'lucide-react'

import { listFiles } from '@/api/storage-api'
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
import { FolderPickerNode, FolderNode } from '@/components/image-gallery/folder-picker-node'
import { useFolderTree } from '@/stores/folder-tree-store'

export interface FolderSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPath: string | null
  onSelect: (path: string) => void
  excludePaths?: string[]
  currentPath?: string
  showNewFolderButton?: boolean
  onCreateFolder?: () => void
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
}) => {
  const { t } = useTranslation()
  const { homeTitle } = useFolderTree()
  const [tree, setTree] = useState<FolderNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(initialSelectedPath)
  const [isLoading, setIsLoading] = useState(false)
  const [excludePathsSet] = useState(() => new Set(excludePaths))

  // Load root folders when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPath(initialSelectedPath)
      loadRootFolders().then(() => {
        // Auto-expand to show current path
        if (currentPath) {
          expandToPath(currentPath)
        }
      })
    }
  }, [open, currentPath, initialSelectedPath])

  const loadRootFolders = async () => {
    setIsLoading(true)
    try {
      const result = await listFiles({
        path: '',
        onlyFolders: true,
      })

      const folders: FolderNode[] = [
        // Add root folder as first option
        {
          name: homeTitle,
          path: '',
          isDirectory: true,
          isLoaded: true,
          isExpanded: true,
          children: result.items.map((item) => ({
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            isLoaded: false,
            isExpanded: false,
          })),
        },
      ]

      setTree(folders)
    } catch (error) {
      console.error('Failed to load root folders:', error)
      setTree([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateNode = useCallback((path: string, updates: Partial<FolderNode>) => {
    setTree((prevTree) => {
      const updateNodeRecursive = (nodes: FolderNode[]): FolderNode[] => {
        return nodes.map((node) => {
          if (node.path === path) {
            return { ...node, ...updates }
          }
          if (node.children) {
            return {
              ...node,
              children: updateNodeRecursive(node.children),
            }
          }
          return node
        })
      }
      return updateNodeRecursive(prevTree)
    })
  }, [])

  // Auto-expand folders to reveal the current path
  const expandToPath = useCallback(
    async (targetPath: string) => {
      if (!targetPath) return

      // Split path into segments (e.g., "folder1/folder2/folder3" -> ["folder1", "folder2", "folder3"])
      const segments = targetPath.split('/').filter(Boolean)

      // Expand each parent folder sequentially
      let currentPath = ''
      for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment

        // Load and expand this folder
        try {
          const result = await listFiles({
            path: currentPath,
            onlyFolders: true,
          })

          const children: FolderNode[] = result.items.map((item) => ({
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            isLoaded: false,
            isExpanded: false,
          }))

          updateNode(currentPath, {
            children,
            isLoaded: true,
            isExpanded: true,
          })

          // Small delay to allow state to update
          await new Promise((resolve) => setTimeout(resolve, 50))
        } catch (error) {
          console.error(`Failed to load folder: ${currentPath}`, error)
          break
        }
      }
    },
    [updateNode],
  )

  const handleSelect = () => {
    if (selectedPath !== null) {
      onSelect(selectedPath)
      onOpenChange(false)
    }
  }

  const handleCreateFolder = () => {
    onCreateFolder?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{t('pages.gallery.moveItems.selectDestination')}</DialogTitle>
          <DialogDescription>
            {t('pages.gallery.moveItems.selectDestinationDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className='my-4'>
          {selectedPath !== null && (
            <div className='bg-muted mb-3 rounded-md p-2 text-sm'>
              <span className='text-muted-foreground'>{t('pages.gallery.moveItems.selected')}:</span>{' '}
              <span className='font-medium'>{selectedPath === '' ? homeTitle : selectedPath}</span>
            </div>
          )}

          <ScrollArea className='border-muted h-96 w-full max-w-md overflow-x-hidden rounded-md border'>
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
              <div className='w-full space-y-0.5 p-2'>
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
              {t('pages.gallery.moveItems.select')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
