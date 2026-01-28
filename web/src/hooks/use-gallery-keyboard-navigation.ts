import { useEffect, useRef, useState } from 'react'

import { Gallery } from '@/components/image-gallery/folder-grid'
import { GalleryImage, Position } from '@/components/image-gallery/image-view'

export interface UseGalleryKeyboardNavigationProps {
  folders: Gallery[]
  images: GalleryImage[]
  folderColumnCount: number
  imageColumnCount: number
  onFolderClick?: (folder: Gallery, index: number, event?: React.MouseEvent) => void
  onImageClick?: (imageKey: string, position: Position) => void
}

export function useGalleryKeyboardNavigation({
  folders,
  images,
  folderColumnCount,
  imageColumnCount,
  onFolderClick,
  onImageClick,
}: UseGalleryKeyboardNavigationProps) {
  const [focusedGrid, setFocusedGrid] = useState<'folder' | 'image' | null>(null)
  const [focusedFolderIndex, setFocusedFolderIndex] = useState<number>(-1)
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(-1)
  const [visibleImageRange, setVisibleImageRange] = useState<{
    start: number
    end: number
    firstVisible: number
  }>({
    start: 0,
    end: 0,
    firstVisible: 0,
  })
  const galleryContainerRef = useRef<HTMLDivElement>(null)
  const folderRefs = useRef<(HTMLDivElement | null)[]>([])
  const imageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Initialize folder refs array
  useEffect(() => {
    folderRefs.current = folderRefs.current.slice(0, folders.length)
  }, [folders.length])

  // Focus folder element when focusedFolderIndex changes
  useEffect(() => {
    if (
      focusedGrid === 'folder' &&
      focusedFolderIndex >= 0 &&
      focusedFolderIndex < folders.length
    ) {
      folderRefs.current[focusedFolderIndex]?.focus()
    }
  }, [focusedFolderIndex, folders.length, focusedGrid])

  // Focus image element when focusedImageIndex changes
  useEffect(() => {
    if (focusedGrid === 'image' && focusedImageIndex >= 0 && focusedImageIndex < images.length) {
      requestAnimationFrame(() => {
        const element = imageRefs.current.get(focusedImageIndex)
        if (element) {
          element.focus()
        }
      })
    }
  }, [focusedImageIndex, images.length, focusedGrid])

  // Folder keyboard handler
  const handleFolderKeyDown = (event: React.KeyboardEvent, index: number) => {
    const currentRow = Math.floor(index / folderColumnCount)
    const lastRow = Math.floor((folders.length - 1) / folderColumnCount)
    let newIndex = index

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onFolderClick?.(folders[index], index)
        break

      case 'ArrowRight':
        event.preventDefault()
        newIndex = Math.min(index + 1, folders.length - 1)
        break

      case 'ArrowLeft':
        event.preventDefault()
        newIndex = Math.max(index - 1, 0)
        break

      case 'ArrowDown':
        event.preventDefault()
        // If we're on the last row, navigate to images
        if (currentRow === lastRow && images.length > 0) {
          setFocusedGrid('image')
          // Focus on the first fully visible image
          setFocusedImageIndex(visibleImageRange.firstVisible)
          setFocusedFolderIndex(-1)
          return
        }
        newIndex = Math.min(index + folderColumnCount, folders.length - 1)
        break

      case 'ArrowUp':
        event.preventDefault()
        newIndex = Math.max(index - folderColumnCount, 0)
        break

      case 'Home':
        event.preventDefault()
        newIndex = 0
        break

      case 'End':
        event.preventDefault()
        newIndex = folders.length - 1
        break

      default:
        return
    }

    if (newIndex !== index) {
      setFocusedGrid('folder')
      setFocusedFolderIndex(newIndex)
    }
  }

  // Image keyboard handler
  const handleImageKeyDown = (event: React.KeyboardEvent, index: number) => {
    const currentRow = Math.floor(index / imageColumnCount)
    let newIndex = index

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        const image = images[index]
        if (image && onImageClick) {
          const element = imageRefs.current.get(index)
          if (element) {
            const rect = element.getBoundingClientRect()
            onImageClick(image.imageKey, {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            })
          }
        }
        break

      case 'ArrowRight':
        event.preventDefault()
        newIndex = Math.min(index + 1, images.length - 1)
        break

      case 'ArrowLeft':
        event.preventDefault()
        newIndex = Math.max(index - 1, 0)
        break

      case 'ArrowDown':
        event.preventDefault()
        newIndex = Math.min(index + imageColumnCount, images.length - 1)
        break

      case 'ArrowUp':
        event.preventDefault()
        // If we're on the first row, navigate to folders
        if (currentRow === 0 && folders.length > 0) {
          setFocusedGrid('folder')
          setFocusedFolderIndex(folders.length - 1)
          setFocusedImageIndex(-1)
          return
        }
        newIndex = Math.max(index - imageColumnCount, 0)
        break

      case 'Home':
        event.preventDefault()
        newIndex = 0
        break

      case 'End':
        event.preventDefault()
        newIndex = images.length - 1
        break

      default:
        return
    }

    if (newIndex !== index) {
      setFocusedGrid('image')
      setFocusedImageIndex(newIndex)
    }
  }

  // Handle folder click
  const handleFolderClick = (folder: Gallery, index: number, event?: React.MouseEvent) => {
    setFocusedGrid('folder')
    setFocusedFolderIndex(index)
    onFolderClick?.(folder, index, event)
  }

  // Handle image click
  const handleImageClick = (imageKey: string, position: Position, index: number) => {
    setFocusedGrid('image')
    setFocusedImageIndex(index)
    onImageClick?.(imageKey, position)
  }

  // Handler for visible range updates from ImageGrid
  const handleVisibleRangeChange = (
    startIndex: number,
    endIndex: number,
    firstVisibleIndex: number,
  ) => {
    setVisibleImageRange({ start: startIndex, end: endIndex, firstVisible: firstVisibleIndex })
  }

  // Reset focus when gallery container loses focus
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    // Only reset if focus is leaving the gallery container entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setFocusedGrid(null)
      setFocusedFolderIndex(-1)
      setFocusedImageIndex(-1)
    }
  }

  return {
    galleryContainerRef,
    galleryContainerProps: {
      className: 'focus-visible:outline-none',
      onBlur: handleBlur,
    },
    folderGridProps: {
      focusedIndex: focusedGrid === 'folder' ? focusedFolderIndex : -1,
      folderRefs,
      onFolderKeyDown: handleFolderKeyDown,
      onFolderClick: handleFolderClick,
    },
    imageGridProps: {
      focusedIndex: focusedGrid === 'image' ? focusedImageIndex : -1,
      imageRefs,
      onImageKeyDown: handleImageKeyDown,
      onImageClick: handleImageClick,
      onVisibleRangeChange: handleVisibleRangeChange,
    },
  }
}
