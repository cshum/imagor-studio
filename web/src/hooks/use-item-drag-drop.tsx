import React, { useCallback } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Folder, Image, Layers } from 'lucide-react'

import type { DragItem as StoreDragItem } from '@/stores/drag-drop-store'
import {
  clearDragOver,
  endDrag,
  setDragOver,
  startDrag,
  useDragDrop,
} from '@/stores/drag-drop-store'

// Re-export DragItem for backward compatibility
export type DragItem = StoreDragItem

export interface DragData {
  type: 'imagor-items'
  items: DragItem[]
  sourceGalleryKey: string
}

export interface DragDropState {
  isDragging: boolean
  draggedItems: DragItem[]
  dragOverTarget: string | null
}

export interface UseDragDropOptions {
  onDrop?: (items: DragItem[], targetFolderKey: string) => void | Promise<void>
  isAuthenticated: boolean
}

export function useItemDragDrop({ onDrop, isAuthenticated }: UseDragDropOptions) {
  // Use the global drag drop store
  const dragState = useDragDrop()

  // Start dragging items
  const handleDragStart = useCallback(
    (e: React.DragEvent, items: DragItem[], sourceGalleryKey: string) => {
      if (!isAuthenticated) {
        e.preventDefault()
        return
      }

      const dragData: DragData = {
        type: 'imagor-items',
        items,
        sourceGalleryKey,
      }

      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('application/json', JSON.stringify(dragData))
      // Mark as internal drag to prevent GalleryDropZone from activating
      e.dataTransfer.setData('application/x-imagor-internal', 'true')

      // Create unified drag preview badge using React component with JSX
      const dragImage = document.createElement('div')

      // Render the entire badge as a React component with Tailwind CSS
      const DragPreviewBadge = ({ icon, text }: { icon: React.ReactElement; text: string }) => (
        <div className='absolute -top-[1000px] flex max-w-[200px] items-center gap-2 overflow-hidden rounded-lg bg-blue-500/95 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg'>
          <span className='flex flex-shrink-0 items-center'>{icon}</span>
          <span className='overflow-hidden text-ellipsis'>{text}</span>
        </div>
      )

      if (items.length === 1) {
        // Single item: Show Lucide icon + truncated name
        const item = items[0]
        const IconComponent = item.type === 'folder' ? Folder : Image
        const truncatedName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name
        dragImage.innerHTML = renderToStaticMarkup(
          <DragPreviewBadge icon={<IconComponent size={16} />} text={truncatedName} />,
        )
      } else {
        // Multiple items: Show Lucide Layers icon + count
        dragImage.innerHTML = renderToStaticMarkup(
          <DragPreviewBadge icon={<Layers size={16} />} text={`${items.length} items`} />,
        )
      }

      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)

      // Update global store
      startDrag(items)
    },
    [isAuthenticated],
  )

  // End dragging
  const handleDragEnd = useCallback(() => {
    // Clear both drag state and drag-over target
    clearDragOver()
    endDrag()
  }, [])

  // Validate if drop is allowed
  const isValidDropTarget = useCallback(
    (targetFolderKey: string, draggedItems: DragItem[]): boolean => {
      // Check if any dragged item is a folder being dropped into itself or its descendants
      for (const item of draggedItems) {
        if (item.type === 'folder') {
          const folderPath = item.key.endsWith('/') ? item.key : `${item.key}/`
          const targetPath = targetFolderKey.endsWith('/') ? targetFolderKey : `${targetFolderKey}/`

          // Cannot drop folder into itself
          if (folderPath === targetPath) {
            return false
          }

          // Cannot drop folder into its own descendants
          if (targetPath.startsWith(folderPath)) {
            return false
          }
        }
      }

      return true
    },
    [],
  )

  // Handle drag over (required to enable drop)
  const handleDragOver = useCallback(
    (e: React.DragEvent, targetFolderKey: string) => {
      if (!isAuthenticated) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      // Set drop effect based on whether we're currently dragging
      // We can't read dataTransfer.getData during dragOver, so we rely on isDragging state
      if (dragState.isDragging) {
        if (isValidDropTarget(targetFolderKey, dragState.draggedItems)) {
          e.dataTransfer.dropEffect = 'move'
        } else {
          e.dataTransfer.dropEffect = 'none'
        }
      }
    },
    [isAuthenticated, isValidDropTarget, dragState.isDragging, dragState.draggedItems],
  )

  // Handle drag enter
  const handleDragEnter = useCallback(
    (e: React.DragEvent, targetFolderKey: string) => {
      if (!isAuthenticated) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      // Update drag over target if we're currently dragging and it's a valid target
      if (dragState.isDragging && isValidDropTarget(targetFolderKey, dragState.draggedItems)) {
        setDragOver(targetFolderKey)
      }
    },
    [isAuthenticated, isValidDropTarget, dragState.isDragging, dragState.draggedItems],
  )

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: React.DragEvent, targetFolderKey: string) => {
      if (!isAuthenticated) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      // Check if we're actually leaving the folder or just moving to a child element
      const currentTarget = e.currentTarget as HTMLElement
      const relatedTarget = e.relatedTarget as Node | null

      // Only clear if we're actually leaving the folder (not moving to a child)
      if (relatedTarget && currentTarget.contains(relatedTarget)) {
        // Still inside the folder, don't clear
        return
      }

      // Actually leaving the folder, clear the indicator
      if (dragState.dragOverTarget === targetFolderKey) {
        clearDragOver()
      }
    },
    [isAuthenticated, dragState.dragOverTarget],
  )

  // Handle drag leave from container (when leaving entire grid/sidebar)
  const handleContainerDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!isAuthenticated) {
        return
      }

      // Check if we're actually leaving the container
      const currentTarget = e.currentTarget as HTMLElement
      const relatedTarget = e.relatedTarget as Node | null

      // Only clear if we're leaving the container entirely
      if (relatedTarget && currentTarget.contains(relatedTarget)) {
        // Still inside the container, don't clear
        return
      }

      // Leaving the container, clear any drag-over state
      clearDragOver()
    },
    [isAuthenticated],
  )

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetFolderKey: string) => {
      if (!isAuthenticated) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const data = e.dataTransfer.getData('application/json')
      if (!data) return

      try {
        const dragData: DragData = JSON.parse(data)
        if (dragData.type !== 'imagor-items') return

        if (!isValidDropTarget(targetFolderKey, dragData.items)) {
          return
        }

        // Call the drop handler
        if (onDrop) {
          await onDrop(dragData.items, targetFolderKey)
        }
      } catch (error) {
        console.error('Drop error:', error)
      } finally {
        // Always clear drag-over and end drag
        clearDragOver()
        endDrag()
      }
    },
    [isAuthenticated, isValidDropTarget, onDrop],
  )

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleContainerDragLeave,
    handleDrop,
    isValidDropTarget,
  }
}
