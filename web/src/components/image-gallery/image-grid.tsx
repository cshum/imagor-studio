import React, { RefObject, useRef } from 'react'
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
  focusedIndex: number
  onImageClick?: (imageKey: string, position: Position, index: number) => void
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
  focusedIndex,
  onImageClick,
  onKeyDown,
  imageRef,
}: ImageCellProps) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onImageClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      onImageClick(
        image.imageKey,
        {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        index,
      )
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
      className='focus-visible:ring-ring absolute box-border cursor-pointer rounded-md p-1 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset md:p-1.5'
      style={{
        width: `${columnWidth}px`,
        height: `${rowHeight}px`,
        transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
        willChange: 'transform',
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={index === 0 && focusedIndex === -1 ? 0 : isFocused ? 0 : -1}
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
          <div className='absolute right-3 bottom-2 rounded-full bg-black/60 p-2 transition-opacity group-hover:bg-black/75'>
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
  focusedIndex?: number
  imageRefs?: RefObject<Map<number, HTMLDivElement>>
  onImageKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onImageClick?: (imageKey: string, position: Position, index: number) => void
}

export const ImageGrid = ({
  images,
  aspectRatio,
  width,
  scrollTop,
  maxImageWidth,
  focusedIndex = -1,
  imageRefs,
  onImageKeyDown,
  onImageClick,
}: ImageGridProps) => {
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
          focusedIndex={focusedIndex}
          onImageClick={onImageClick}
          onKeyDown={onImageKeyDown}
          imageRef={(el) => {
            if (imageRefs?.current) {
              if (el) {
                imageRefs.current.set(i, el)
              } else {
                imageRefs.current.delete(i)
              }
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
