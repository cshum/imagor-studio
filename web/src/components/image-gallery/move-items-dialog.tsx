import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { moveFile } from '@/api/storage-api'
import { FolderSelectionDialog } from '@/components/folder-picker/folder-selection-dialog.tsx'
import { hasErrorCode } from '@/lib/error-utils'
import { invalidateFolderCache } from '@/stores/folder-tree-store'

export interface MoveItem {
  key: string
  name: string
  type: 'file' | 'folder'
}

export interface MoveItemsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MoveItem[]
  currentPath: string
  spaceKey?: string
  onMoveComplete?: () => void
  onCreateFolder?: (selectedPath: string | null) => void
}

export const MoveItemsDialog: React.FC<MoveItemsDialogProps> = ({
  open,
  onOpenChange,
  items,
  currentPath,
  spaceKey,
  onMoveComplete,
  onCreateFolder,
}) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [isMoving, setIsMoving] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const getMoveProgressMessage = (completed: number) =>
    `${t('pages.gallery.moveItems.move')}... (${completed}/${items.length})`

  // Determine dialog title based on item count
  const dialogTitle =
    items.length === 1
      ? t('pages.gallery.moveItem.title', { name: items[0].name })
      : t('pages.gallery.moveItems.dialogTitle', { count: items.length })

  // Extract folder keys to exclude from destination selection
  const excludePaths = items.filter((item) => item.type === 'folder').map((item) => item.key)

  /**
   * Check if moving a folder to the destination would create a cyclic structure
   */
  const isMovingToSubfolder = (folderPath: string, destinationPath: string): boolean => {
    // Check if destination is the folder itself
    if (destinationPath === folderPath) return true

    // Check if destination is a subfolder of the folder being moved
    return destinationPath.startsWith(`${folderPath}/`)
  }

  const handleConfirmMove = async (destinationPath: string) => {
    // Validate no cyclic moves for folders before attempting
    for (const item of items) {
      if (item.type === 'folder') {
        if (destinationPath === item.key) {
          toast.error(t('pages.gallery.moveItems.cannotMoveToSelf'))
          return
        }

        if (isMovingToSubfolder(item.key, destinationPath)) {
          toast.error(t('pages.gallery.moveItems.cannotMoveToSubfolder'))
          return
        }
      }
    }

    setIsMoving(true)
    setCompletedCount(0)
    const toastId = toast.loading(getMoveProgressMessage(0))

    try {
      let successCount = 0
      let failCount = 0
      let hasFileExistsError = false

      // Move all items sequentially
      for (const item of items) {
        try {
          const itemName = item.key.split('/').filter(Boolean).pop() || ''
          const newPath = destinationPath ? `${destinationPath}/${itemName}` : itemName

          // Skip if source and destination are the same
          if (item.key === newPath) {
            continue
          }

          await moveFile(item.key, newPath, spaceKey)
          successCount++
          const nextCompletedCount = successCount + failCount
          setCompletedCount(nextCompletedCount)
          toast.loading(getMoveProgressMessage(nextCompletedCount), { id: toastId })

          // Invalidate folder tree cache for affected paths
          if (item.type === 'folder') {
            // Invalidate parent folder of source
            const sourceParentPath = item.key.split('/').slice(0, -1).join('/')
            invalidateFolderCache(sourceParentPath)

            // Invalidate destination folder
            invalidateFolderCache(destinationPath)
          }
        } catch (error: unknown) {
          if (hasErrorCode(error, 'FILE_ALREADY_EXISTS')) {
            hasFileExistsError = true
          }
          failCount++
          const nextCompletedCount = successCount + failCount
          setCompletedCount(nextCompletedCount)
          toast.loading(getMoveProgressMessage(nextCompletedCount), { id: toastId })
        }
      }

      // Close dialog
      onOpenChange(false)
      setIsMoving(false)
      setCompletedCount(0)

      // Call completion callback
      onMoveComplete?.()

      // Refresh gallery
      await router.invalidate()

      // Show result toast
      if (failCount === 0 && successCount > 0) {
        if (items.length === 1) {
          toast.success(t('pages.gallery.moveItem.success', { name: items[0].name }), {
            id: toastId,
          })
        } else {
          toast.success(t('pages.gallery.moveItems.success', { count: successCount }), {
            id: toastId,
          })
        }
      } else if (successCount > 0) {
        const message = hasFileExistsError
          ? t('pages.gallery.moveItems.fileExists')
          : t('pages.gallery.moveItems.partialSuccess', {
              success: successCount,
              failed: failCount,
            })
        toast.warning(message, { id: toastId })
      } else if (failCount > 0) {
        const message = hasFileExistsError
          ? t('pages.gallery.moveItems.fileExists')
          : t('pages.gallery.moveItems.error')
        toast.error(message, { id: toastId })
      }
    } catch {
      toast.error(t('pages.gallery.moveItems.error'), { id: toastId })
      setIsMoving(false)
      setCompletedCount(0)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!isMoving) {
      onOpenChange(open)
    }
  }

  return (
    <FolderSelectionDialog
      open={open}
      onOpenChange={handleDialogClose}
      selectedPath={currentPath}
      onSelect={handleConfirmMove}
      excludePaths={excludePaths}
      currentPath={currentPath}
      title={dialogTitle}
      description={
        isMoving ? getMoveProgressMessage(completedCount) : t('pages.gallery.moveItems.selectDestinationDescription')
      }
      confirmButtonText={t('pages.gallery.moveItems.move')}
      showNewFolderButton={true}
      onCreateFolder={onCreateFolder}
      closeOnSelect={false}
      isSubmitting={isMoving}
    />
  )
}
