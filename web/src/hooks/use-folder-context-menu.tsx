import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteFile, moveFile } from '@/api/storage-api'
import type { FolderContextData } from '@/components/image-gallery/folder-context-menu'
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { invalidateFolderCache, loadRootFolders } from '@/stores/folder-tree-store'

interface UseFolderContextMenuProps {
  /**
   * Current path being viewed (for redirect detection).
   * Empty string for sidebar (never on current path).
   */
  currentPath: string
  /**
   * Optional function to check if user is authenticated.
   * If provided, menu items will only show when this returns true.
   * If not provided, menu items always show (for sidebar use case).
   */
  isAuthenticated?: () => boolean
  /**
   * Optional callbacks to trigger rename/delete dialogs from context menu.
   * If not provided, menu items won't trigger dialogs (for components that handle dialogs themselves).
   */
  onRename?: (folderKey: string, folderName: string) => void
  onDelete?: (folderKey: string, folderName: string) => void
}

export function useFolderContextMenu({
  currentPath,
  isAuthenticated,
  onRename,
  onDelete,
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

      // Redirect if we renamed the current folder
      if (folderPath === currentPath) {
        toast.success(t('pages.gallery.renameItem.success', { name: newName }))
        navigate({
          to: '/gallery/$galleryKey',
          params: { galleryKey: newPath },
        })
      } else {
        // Invalidate router to refresh gallery-page loader
        router.invalidate()
        toast.success(t('pages.gallery.renameItem.success', { name: newName }))
      }
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

      // Redirect if we deleted the current folder
      if (folderPath === currentPath) {
        toast.success(t('pages.gallery.deleteFolder.success', { folderName }))
        // Navigate to parent folder
        if (parentPath) {
          navigate({
            to: '/gallery/$galleryKey',
            params: { galleryKey: parentPath },
          })
        } else {
          // Deleted a root folder, go to home
          navigate({ to: '/' })
        }
      } else {
        // Invalidate router to refresh gallery-page loader
        router.invalidate()
        toast.success(t('pages.gallery.deleteFolder.success', { folderName }))
      }
    } catch {
      toast.error(t('pages.gallery.deleteFolder.error'))
    } finally {
      setIsDeleting(false)
    }
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
        {showActions && (
          <>
            <ContextMenuItem
              onClick={() => {
                // Trigger rename dialog in component
                setTimeout(() => onRename?.(folderKey, folderName), 0)
              }}
              disabled={isRenaming || isDeleting}
            >
              <Pencil className='mr-2 h-4 w-4' />
              {t('pages.gallery.contextMenu.rename')}
            </ContextMenuItem>
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

  return {
    renderMenuItems,
    handleRename,
    handleDelete,
    isRenaming,
    isDeleting,
  }
}
