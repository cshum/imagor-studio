import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { FolderOpen, Trash2, Type } from 'lucide-react'
import { toast } from 'sonner'

import { deleteFile, moveFile } from '@/api/storage-api'
import type { FolderContextData } from '@/components/image-gallery/folder-context-menu'
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { folderTreeStore, invalidateFolderCache, loadRootFolders } from '@/stores/folder-tree-store'

interface UseFolderContextMenuProps {
  /**
   * Optional function to check if user is authenticated.
   * If provided, menu items will only show when this returns true.
   * If not provided, menu items always show (for sidebar use case).
   */
  isAuthenticated?: () => boolean
  /**
   * Optional callback to handle opening/navigating to a folder.
   */
  onOpen?: (folderKey: string) => void
  /**
   * Optional callbacks to trigger rename/delete dialogs from context menu.
   * If not provided, menu items won't trigger dialogs (for components that handle dialogs themselves).
   */
  onRename?: (folderKey: string, folderName: string) => void
  onDelete?: (folderKey: string, folderName: string) => void
  /**
   * If true, returns renderDropdownMenuItems instead of renderMenuItems.
   * Use this for dropdown menus (three-dots) instead of context menus (right-click).
   */
  useDropdownItems?: boolean
}

/**
 * Check if a folder path affects the current viewing path.
 * Returns true if folderPath is the current path or a parent of it.
 */
function isPathAffected(folderPath: string, currentPath: string): boolean {
  if (!currentPath) return false // Not viewing any folder
  if (currentPath === folderPath) return true // Exact match
  return currentPath.startsWith(`${folderPath}/`) // Parent folder
}

export function useFolderContextMenu({
  isAuthenticated,
  onOpen,
  onRename,
  onDelete,
  useDropdownItems = false,
}: UseFolderContextMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Centralized rename logic - handles cache invalidation and redirect
   */
  const handleRename = async (folderPath: string, newName: string) => {
    setIsRenaming(true)
    try {
      const pathParts = folderPath.split('/')
      pathParts[pathParts.length - 1] = newName
      const newPath = pathParts.join('/')

      await moveFile(folderPath, newPath)

      // Invalidate parent folder cache
      const parentPath = folderPath.split('/').slice(0, -1).join('/')
      if (parentPath) {
        invalidateFolderCache(parentPath)
      }

      // Refresh folder tree
      await loadRootFolders()

      // Show success toast
      toast.success(t('pages.gallery.renameItem.success', { name: newName }))

      // Get current path from folder tree store
      const { currentPath } = folderTreeStore.getState()

      // Check if operation affects current view
      if (isPathAffected(folderPath, currentPath)) {
        // Current route is affected - redirect to home
        await navigate({ to: '/' })
      }
      await router.invalidate()
    } catch {
      toast.error(t('pages.gallery.renameItem.error', { type: 'folder' }))
    } finally {
      setIsRenaming(false)
    }
  }

  /**
   * Centralized delete logic - handles cache invalidation and redirect
   */
  const handleDelete = async (folderPath: string, folderName: string) => {
    setIsDeleting(true)
    try {
      await deleteFile(folderPath)

      // Invalidate parent folder cache
      const parentPath = folderPath.split('/').slice(0, -1).join('/')
      if (parentPath) {
        invalidateFolderCache(parentPath)
      }

      // Refresh folder tree
      await loadRootFolders()

      // Show success toast
      toast.success(t('pages.gallery.deleteFolder.success', { folderName }))

      // Get current path from folder tree store
      const { currentPath } = folderTreeStore.getState()

      // Check if operation affects current view
      if (isPathAffected(folderPath, currentPath)) {
        // Current route is affected - redirect to home
        navigate({ to: '/' })
      } else {
        // Current route not affected - just refresh
        router.invalidate()
      }
    } catch {
      toast.error(t('pages.gallery.deleteFolder.error'))
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Handle opening/navigating to a folder
   */
  const handleOpen = (folderKey: string) => {
    // Navigate to the folder
    navigate({ to: '/gallery/$galleryKey', params: { galleryKey: folderKey } })

    // Call optional callback for additional actions (e.g., close mobile sidebar)
    onOpen?.(folderKey)
  }

  /**
   * Render context menu items
   */
  const renderMenuItems = ({ folderName, folderKey }: FolderContextData) => {
    if (!folderKey) return null

    // If authentication check is provided and user is not authenticated, show only label
    const showActions = !isAuthenticated || isAuthenticated()

    return (
      <>
        <ContextMenuLabel className='break-all'>{folderName}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleOpen(folderKey)}>
          <FolderOpen className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </ContextMenuItem>
        {showActions && (
          <>
            <ContextMenuItem
              onClick={() => {
                // Trigger rename dialog in component
                setTimeout(() => onRename?.(folderKey, folderName), 0)
              }}
              disabled={isRenaming || isDeleting}
            >
              <Type className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                // Trigger delete dialog in component
                setTimeout(() => onDelete?.(folderKey, folderName), 0)
              }}
              className='text-destructive focus:text-destructive'
              disabled={isRenaming || isDeleting}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.folderContextMenu.delete')}
            </ContextMenuItem>
          </>
        )}
      </>
    )
  }

  /**
   * Render dropdown menu items (for three-dots menus)
   */
  const renderDropdownMenuItems = ({ folderName, folderKey }: FolderContextData) => {
    if (!folderKey) return null

    // If authentication check is provided and user is not authenticated, show only label
    const showActions = !isAuthenticated || isAuthenticated()

    return (
      <>
        <DropdownMenuLabel className='break-all'>{folderName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleOpen(folderKey)}>
          <FolderOpen className='mr-2 h-4 w-4' />
          {t('pages.gallery.contextMenu.open')}
        </DropdownMenuItem>
        {showActions && (
          <>
            <DropdownMenuItem onClick={() => onRename?.(folderKey, folderName)}>
              <Type className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onDelete?.(folderKey, folderName)
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('pages.gallery.folderContextMenu.delete')}
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  return {
    renderMenuItems: useDropdownItems ? renderDropdownMenuItems : renderMenuItems,
    handleRename,
    handleDelete,
    isRenaming,
    isDeleting,
  }
}
