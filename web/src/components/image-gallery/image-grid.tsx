import React, { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

import { GalleryImage, Position } from '@/components/image-gallery/image-view.tsx'
import { getFullImageUrl } from '@/lib/api-utils'

interface ImageCellProps {
  image: GalleryImage
  columnWidth: number
  rowHeight: number
  rowIndex: number
  columnIndex: number
  index: number
  isFocused: boolean
  onImageClick?: (imageKey: string, position: Position) => void
  onKeyDown?: (event: React.KeyboardEvent, index: number) => void
  imageRef?: (el: HTMLDivElement | null) => void
}

const ImageCell = ({
  image,
  columnWidth,
  rowHeight,
  rowIndex,
  columnIndex,
  index,
  isFocused,
  onImageClick,
  onKeyDown,
  imageRef,
}: ImageCellProps) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onImageClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      onImageClick(image.imageKey, {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e, index)
    }
  }

  return (
    <div
      key={image.imageKey}
      ref={imageRef}
      data-image-key={image.imageKey}
      data-image-name={image.imageName}
      data-is-video={image.isVideo}
      className='absolute box-border cursor-pointer p-1 md:p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      style={{
        width: `${columnWidth}px`,
        height: `${rowHeight}px`,
        transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
        willChange: 'transform',
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isFocused ? 0 : -1}
      role='button'
      aria-label={`${image.isVideo ? 'Video' : 'Image'}: ${image.imageName}`}
    >
      <div className='relative h-full w-full overflow-hidden rounded-md bg-gray-200 transition-transform duration-300 group-[.not-scrolling]:hover:scale-105 dark:bg-gray-700'>
        <img
          src={getFullImageUrl(image.imageSrc)}
          alt={image.imageName}
          className='h-full w-full object-cover'
          draggable={false}
        />
        {image.isVideo && (
          <div className='absolute right-3 bottom-2 rounded-full bg-black/60 p-1 p-2 transition-opacity group-hover:bg-black/75'>
            <Play className='h-4 w-4 fill-white text-white' />
          </div>
        )}
      </div>
    </div>
  )
}

export interface ImageGridProps {
  images: GalleryImage[]
  aspectRatio: number
  width: number
  scrollTop: number
  maxImageWidth: number
  onImageClick?: (imageKey: string, position: Position) => void
  focusedIndex?: number
  onFocusChange?: (index: number) => void
  onNavigateUp?: () => void
}

export const ImageGrid = ({
  images,
  aspectRatio,
  width,
  scrollTop,
  maxImageWidth,
  onImageClick,
  focusedIndex: externalFocusedIndex,
  onFocusChange,
  onNavigateUp,
}: ImageGridProps) => {
  const focusedIndex = externalFocusedIndex ?? -1
  const imageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Dynamically calculate the number of columns based on maxImageWidth prop
  const columnCount = Math.max(3, Math.floor(width / maxImageWidth))
  const columnWidth = width / columnCount
  const rowHeight = columnWidth / aspectRatio

  const rowCount = Math.ceil(images.length / columnCount)
  const totalHeight = rowCount * rowHeight

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight)
  const overscanCount = visibleRowsCount
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount

  // Determine which images should be rendered based on scroll position
  const startImageIndex = Math.max(
    0,
    Math.floor(scrollTop / rowHeight - overscanCount) * columnCount,
  )
  const endImageIndex = Math.min(images.length, startImageIndex + totalRenderedRows * columnCount)

  // Focus element when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < images.length) {
      requestAnimationFrame(() => {
        const element = imageRefs.current.get(focusedIndex)
        if (element) {
          element.focus()
          element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    }
  }, [focusedIndex, images.length])

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const currentRow = Math.floor(index / columnCount)
    
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
        newIndex = Math.min(index + columnCount, images.length - 1)
        break

      case 'ArrowUp':
        event.preventDefault()
        // If we're on the first row, navigate to folders
        if (currentRow === 0 && onNavigateUp) {
          onNavigateUp()
          return
        }
        newIndex = Math.max(index - columnCount, 0)
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

    if (newIndex !== index && onFocusChange) {
      onFocusChange(newIndex)
    }
  }

  const handleImageClick = (imageKey: string, position: Position, index: number) => {
    onFocusChange?.(index)
    onImageClick?.(imageKey, position)
  }

  const visibleImages: React.ReactElement[] = []
  for (let i = startImageIndex; i < endImageIndex; i++) {
    const rowIndex = Math.floor(i / columnCount)
    const columnIndex = i % columnCount
    const image = images[i]

    if (image) {
      visibleImages.push(
        <ImageCell
          key={image.imageKey}
          image={image}
          columnWidth={columnWidth}
          rowHeight={rowHeight}
          rowIndex={rowIndex}
          columnIndex={columnIndex}
          index={i}
          isFocused={i === focusedIndex}
          onImageClick={(imageKey, position) => handleImageClick(imageKey, position, i)}
          onKeyDown={handleKeyDown}
          imageRef={(el) => {
            if (el) {
              imageRefs.current.set(i, el)
            } else {
              imageRefs.current.delete(i)
            }
          }}
        />,
      )
    }
  }

  if (images.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden`}
      style={{ height: `${totalHeight}px` }}
      role='grid'
      aria-label='Images'
      aria-rowcount={rowCount}
      aria-colcount={columnCount}
      tabIndex={-1}
    >
      {visibleImages}
    </div>
  )
}
