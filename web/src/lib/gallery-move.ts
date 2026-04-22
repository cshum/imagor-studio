import { moveFile } from '@/api/storage-api'
import { hasErrorCode } from '@/lib/error-utils'
import { invalidateFolderCache } from '@/stores/folder-tree-store'

export interface GalleryMoveItem {
  key: string
  type: 'file' | 'folder'
}

export interface GalleryMoveProgress {
  completedCount: number
  totalCount: number
  successCount: number
  failCount: number
}

export interface GalleryMoveResult {
  successCount: number
  skippedCount: number
  errorCount: number
}

interface MoveGalleryItemsOptions {
  items: GalleryMoveItem[]
  destinationPath: string
  spaceKey?: string
  fileConcurrency?: number
  onProgress?: (progress: GalleryMoveProgress) => void
}

export async function moveGalleryItems({
  items,
  destinationPath,
  spaceKey,
  fileConcurrency = 4,
  onProgress,
}: MoveGalleryItemsOptions): Promise<GalleryMoveResult> {
  let successCount = 0
  let skippedCount = 0
  let errorCount = 0
  let completedCount = 0

  const reportProgress = () => {
    onProgress?.({
      completedCount,
      totalCount: items.length,
      successCount,
      failCount: skippedCount + errorCount,
    })
  }

  const moveItem = async (item: GalleryMoveItem) => {
    const itemName = item.key.split('/').filter(Boolean).pop() || ''
    const newPath = destinationPath ? `${destinationPath}/${itemName}` : itemName

    if (item.key === newPath) {
      completedCount++
      reportProgress()
      return
    }

    try {
      await moveFile(item.key, newPath, spaceKey)
      successCount++

      if (item.type === 'folder') {
        invalidateFolderCache(item.key.split('/').slice(0, -1).join('/'))
        invalidateFolderCache(destinationPath)
      }
    } catch (error: unknown) {
      if (hasErrorCode(error, 'FILE_ALREADY_EXISTS')) {
        skippedCount++
      } else {
        errorCount++
      }
    } finally {
      completedCount++
      reportProgress()
    }
  }

  const folderItems = items.filter((item) => item.type === 'folder')
  const fileItems = items.filter((item) => item.type === 'file')

  for (const item of folderItems) {
    await moveItem(item)
  }

  if (fileItems.length > 0) {
    let nextIndex = 0
    const workerCount = Math.min(fileConcurrency, fileItems.length)

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < fileItems.length) {
          const currentIndex = nextIndex
          nextIndex++
          await moveItem(fileItems[currentIndex])
        }
      }),
    )
  }

  return {
    successCount,
    skippedCount,
    errorCount,
  }
}
