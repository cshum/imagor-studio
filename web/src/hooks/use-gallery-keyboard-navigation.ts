import { useEffect, useRef, useState } from 'react'

import { Gallery } from '@/components/image-gallery/folder-grid'
import { GalleryImage } from '@/components/image-gallery/image-view'

export interface UseGalleryKeyboardNavigationProps {
  folders: Gallery[]
  images: GalleryImage[]
  isEmpty: boolean
}

export function useGalleryKeyboardNavigation({
  folders,
  images,
  isEmpty,
}: UseGalleryKeyboardNavigationProps) {
  const [focusedGrid, setFocusedGrid] = useState<'folder' | 'image' | null>(null)
  const [focusedFolderIndex, setFocusedFolderIndex] = useState<number>(-1)
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(-1)
  const galleryContainerRef = useRef<HTMLDivElement>(null)

  // Unified keyboard navigation handlers
  const handleGalleryContainerFocus = () => {
    // When gallery container receives focus, focus first folder or first image
    if (focusedGrid === null) {
      if (folders.length > 0) {
        setFocusedGrid('folder')
        setFocusedFolderIndex(0)
      } else if (images.length > 0) {
        setFocusedGrid('image')
        setFocusedImageIndex(0)
      }
    }
  }

  const handleGalleryContainerKeyDown = (event: React.KeyboardEvent) => {
    // If container has focus and no grid is focused, handle initial navigation
    if (
      focusedGrid === null &&
      ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)
    ) {
      event.preventDefault()
      if (folders.length > 0) {
        setFocusedGrid('folder')
        setFocusedFolderIndex(0)
      } else if (images.length > 0) {
        setFocusedGrid('image')
        setFocusedImageIndex(0)
      }
    }
  }

  const handleFolderFocusChange = (index: number) => {
    setFocusedGrid('folder')
    setFocusedFolderIndex(index)
  }

  const handleImageFocusChange = (index: number) => {
    setFocusedGrid('image')
    setFocusedImageIndex(index)
  }

  const handleNavigateFromFoldersToImages = () => {
    if (images.length > 0) {
      setFocusedGrid('image')
      setFocusedImageIndex(0)
      setFocusedFolderIndex(-1)
    }
  }

  const handleNavigateFromImagesToFolders = () => {
    if (folders.length > 0) {
      setFocusedGrid('folder')
      setFocusedFolderIndex(folders.length - 1)
      setFocusedImageIndex(-1)
    }
  }

  // Auto-focus first item when gallery becomes non-empty
  useEffect(() => {
    if (focusedGrid === null && !isEmpty) {
      if (folders.length > 0) {
        setFocusedGrid('folder')
        setFocusedFolderIndex(0)
      } else if (images.length > 0) {
        setFocusedGrid('image')
        setFocusedImageIndex(0)
      }
    }
  }, [isEmpty, folders.length, images.length, focusedGrid])

  return {
    galleryContainerRef,
    galleryContainerProps: {
      tabIndex: 0 as const,
      onFocus: handleGalleryContainerFocus,
      onKeyDown: handleGalleryContainerKeyDown,
      className:
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    },
    folderGridProps: {
      focusedIndex: focusedGrid === 'folder' ? focusedFolderIndex : -1,
      onFocusChange: handleFolderFocusChange,
      onNavigateDown: handleNavigateFromFoldersToImages,
    },
    imageGridProps: {
      focusedIndex: focusedGrid === 'image' ? focusedImageIndex : -1,
      onFocusChange: handleImageFocusChange,
      onNavigateUp: handleNavigateFromImagesToFolders,
    },
  }
}
