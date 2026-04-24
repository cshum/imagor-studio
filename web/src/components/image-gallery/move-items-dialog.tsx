import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { FolderSelectionDialog } from '@/components/folder-picker/folder-selection-dialog.tsx'
import { moveGalleryItems } from '@/lib/gallery-move'
import type { SpaceIdentity } from '@/lib/space'

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
  space?: SpaceIdentity
  onMoveComplete?: () => void
}

export const MoveItemsDialog: React.FC<MoveItemsDialogProps> = ({
  open,
  onOpenChange,
  items,
  currentPath,
  space,
  onMoveComplete,
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
      const { successCount, skippedCount, errorCount } = await moveGalleryItems({
        items,
        destinationPath,
        spaceKey: space?.spaceKey,
        onProgress: ({ completedCount: nextCompletedCount }) => {
          setCompletedCount(nextCompletedCount)
          toast.loading(getMoveProgressMessage(nextCompletedCount), { id: toastId })
        },
      })

      // Close dialog
      onOpenChange(false)
      setIsMoving(false)
      setCompletedCount(0)

      // Call completion callback
      onMoveComplete?.()

      // Refresh gallery
      await router.invalidate()

      // Show result toast
      if (skippedCount === 0 && errorCount === 0 && successCount > 0) {
        if (items.length === 1) {
          toast.success(t('pages.gallery.moveItem.success', { name: items[0].name }), {
            id: toastId,
          })
        } else {
          toast.success(t('pages.gallery.moveItems.success', { count: successCount }), {
            id: toastId,
          })
        }
      } else if (successCount > 0 && skippedCount > 0 && errorCount === 0) {
        const message = t('pages.gallery.moveItems.partialSkipped', {
          success: successCount,
          skipped: skippedCount,
        })
        toast.warning(message, { id: toastId })
      } else if (successCount === 0 && skippedCount > 0 && errorCount === 0) {
        toast.warning(t('pages.gallery.moveItems.skipped', { count: skippedCount }), {
          id: toastId,
        })
      } else if (successCount > 0 && skippedCount > 0 && errorCount > 0) {
        toast.warning(
          t('pages.gallery.moveItems.partialMixed', {
            success: successCount,
            skipped: skippedCount,
            failed: errorCount,
          }),
          { id: toastId },
        )
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(
          t('pages.gallery.moveItems.partialSuccess', {
            success: successCount,
            failed: errorCount,
          }),
          { id: toastId },
        )
      } else if (skippedCount > 0 && errorCount > 0) {
        toast.error(
          t('pages.gallery.moveItems.skippedWithErrors', {
            skipped: skippedCount,
            failed: errorCount,
          }),
          { id: toastId },
        )
      } else if (errorCount > 0) {
        const message = t('pages.gallery.moveItems.error')
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
      space={space}
      title={dialogTitle}
      description={
        isMoving
          ? getMoveProgressMessage(completedCount)
          : t('pages.gallery.moveItems.selectDestinationDescription')
      }
      confirmButtonText={t('pages.gallery.moveItems.move')}
      closeOnSelect={false}
      isSubmitting={isMoving}
    />
  )
}
