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

      // Create unified drag preview badge for both single and multiple items
      const dragImage = document.createElement('div')
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.padding = '10px 14px'
      dragImage.style.backgroundColor = 'rgba(59, 130, 246, 0.95)'
      dragImage.style.color = 'white'
      dragImage.style.borderRadius = '8px'
      dragImage.style.fontSize = '13px'
      dragImage.style.fontWeight = '600'
      dragImage.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
      dragImage.style.display = 'flex'
      dragImage.style.alignItems = 'center'
      dragImage.style.gap = '8px'
      dragImage.style.maxWidth = '200px'
      dragImage.style.whiteSpace = 'nowrap'
      dragImage.style.overflow = 'hidden'

      if (items.length === 1) {
        // Single item: Show Lucide icon + truncated name
        const item = items[0]
        // Lucide Folder or Image icon SVG
        const iconSvg =
          item.type === 'folder'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
        const truncatedName =
          item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name
        dragImage.innerHTML = `<span style="display: flex; align-items: center; flex-shrink: 0;">${iconSvg}</span><span style="overflow: hidden; text-overflow: ellipsis;">${truncatedName}</span>`
      } else {
        // Multiple items: Show Lucide Layers icon + count
        const layersIconSvg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>'
        dragImage.innerHTML = `<span style="display: flex; align-items: center; flex-shrink: 0;">${layersIconSvg}</span><span>${items.length} items</span>`
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
