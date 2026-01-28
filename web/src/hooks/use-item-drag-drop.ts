import { useCallback, useState } from 'react'

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

      // Set drag image to show count if multiple items
      if (items.length > 1) {
        const dragImage = document.createElement('div')
        dragImage.style.position = 'absolute'
        dragImage.style.top = '-1000px'
        dragImage.style.padding = '8px 12px'
        dragImage.style.backgroundColor = '#3b82f6'
        dragImage.style.color = 'white'
        dragImage.style.borderRadius = '6px'
        dragImage.style.fontSize = '14px'
        dragImage.style.fontWeight = '600'
        dragImage.textContent = `${items.length} items`
        document.body.appendChild(dragImage)
        e.dataTransfer.setDragImage(dragImage, 0, 0)
        setTimeout(() => document.body.removeChild(dragImage), 0)
      }

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
