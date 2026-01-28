import React, { useCallback, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Folder, Image, Layers } from 'lucide-react'

export interface DragItem {
  key: string // Full path
  name: string
  type: 'folder' | 'image'
}

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
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    draggedItems: [],
    dragOverTarget: null,
  })

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
        <div className="absolute -top-[1000px] flex items-center gap-2 px-3.5 py-2.5 bg-blue-500/95 text-white rounded-lg text-sm font-semibold shadow-lg max-w-[200px] whitespace-nowrap overflow-hidden">
          <span className="flex items-center flex-shrink-0">{icon}</span>
          <span className="overflow-hidden text-ellipsis">{text}</span>
        </div>
      )

      if (items.length === 1) {
        // Single item: Show Lucide icon + truncated name
        const item = items[0]
        const IconComponent = item.type === 'folder' ? Folder : Image
        const truncatedName =
          item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name
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

      setDragState({
        isDragging: true,
        draggedItems: items,
        dragOverTarget: null,
      })
    },
    [isAuthenticated],
  )

  // End dragging
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItems: [],
      dragOverTarget: null,
    })
  }, [])

  // Validate if drop is allowed
  const isValidDropTarget = useCallback(
    (targetFolderKey: string, draggedItems: DragItem[]): boolean => {
      // Check if any dragged item is a folder being dropped into itself or its descendants
      for (const item of draggedItems) {
        if (item.type === 'folder') {
          const folderPath = item.key.endsWith('/') ? item.key : `${item.key}/`
          const targetPath = targetFolderKey.endsWith('/')
            ? targetFolderKey
            : `${targetFolderKey}/`

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

      const data = e.dataTransfer.getData('application/json')
      if (!data) return

      try {
        const dragData: DragData = JSON.parse(data)
        if (dragData.type !== 'imagor-items') return

        if (isValidDropTarget(targetFolderKey, dragData.items)) {
          e.dataTransfer.dropEffect = 'move'
        } else {
          e.dataTransfer.dropEffect = 'none'
        }
      } catch {
        // Invalid drag data
      }
    },
    [isAuthenticated, isValidDropTarget],
  )

  // Handle drag enter
  const handleDragEnter = useCallback(
    (e: React.DragEvent, targetFolderKey: string) => {
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

        if (isValidDropTarget(targetFolderKey, dragData.items)) {
          setDragState((prev) => ({
            ...prev,
            dragOverTarget: targetFolderKey,
          }))
        }
      } catch {
        // Invalid drag data
      }
    },
    [isAuthenticated, isValidDropTarget],
  )

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: React.DragEvent, targetFolderKey: string) => {
      if (!isAuthenticated) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      // Only clear if leaving the current target
      setDragState((prev) => {
        if (prev.dragOverTarget === targetFolderKey) {
          return {
            ...prev,
            dragOverTarget: null,
          }
        }
        return prev
      })
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
        setDragState({
          isDragging: false,
          draggedItems: [],
          dragOverTarget: null,
        })
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
    handleDrop,
    isValidDropTarget,
  }
}
