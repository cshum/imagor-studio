import React, { RefObject, useEffect, useRef, useState } from 'react'
import { Check, MoreVertical, Play } from 'lucide-react'

import { GalleryImage, Position } from '@/components/image-gallery/image-view.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  firstVisibleImageIndex: number
  showFileName?: boolean
  isSelected?: boolean
  onImageClick?: (imageKey: string, position: Position, index: number) => void
  onSelectionToggle?: (imageKey: string, index: number, event: React.MouseEvent) => void
  renderMenuItems?: (image: GalleryImage) => React.ReactNode
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
  firstVisibleImageIndex,
  showFileName = false,
  isSelected = false,
  onImageClick,
  onSelectionToggle,
  renderMenuItems,
  onKeyDown,
  imageRef,
}: ImageCellProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelectionToggle) {
      onSelectionToggle(image.imageKey, index, e)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check for Cmd/Ctrl+Click for selection
    if ((e.metaKey || e.ctrlKey) && onSelectionToggle) {
      e.preventDefault()
      e.stopPropagation()
      onSelectionToggle(image.imageKey, index, e)
      return
    }

    // Normal image click
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
      className='group/image focus-visible:ring-ring absolute box-border cursor-pointer rounded-xl p-1 select-none focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset md:p-1.5'
      style={{
        width: `${columnWidth}px`,
        height: `${rowHeight}px`,
        transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
        willChange: 'transform',
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={index === firstVisibleImageIndex && focusedIndex === -1 ? 0 : isFocused ? 0 : -1}
      role='button'
      aria-label={`${image.isVideo ? 'Video' : 'Image'}: ${image.imageName}`}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-md bg-gray-200 transition-transform duration-300 group-[.not-scrolling]:hover:scale-105 dark:bg-gray-700 ${isSelected ? 'ring-2 ring-blue-600' : ''}`}
      >
        <img
          src={getFullImageUrl(image.imageSrc)}
          alt={image.imageName}
          className='h-full w-full object-cover'
          draggable={false}
        />
        {/* Selection checkbox - top left */}
        {onSelectionToggle && (
          <div
            className={`pointer-events-none absolute top-2 left-2 opacity-0 transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 md:opacity-0 md:group-hover/image:opacity-100 ${isSelected ? 'pointer-events-auto !opacity-100' : ''}`}
            onClick={handleSelectionClick}
          >
            <div
              className={`cursor-pointer rounded-full p-1.5 transition-all ${isSelected ? 'bg-blue-600' : 'bg-black/10 hover:bg-black/40'}`}
              role='button'
              aria-label={isSelected ? 'Deselect' : 'Select'}
              tabIndex={-1}
            >
              <Check className='h-4 w-4 text-white' />
            </div>
          </div>
        )}
        {renderMenuItems && (
          <DropdownMenu onOpenChange={setIsDropdownOpen} modal={false}>
            <div
              className={`pointer-events-none absolute top-2 right-2 opacity-0 transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 ${isDropdownOpen ? 'pointer-events-auto opacity-100' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuTrigger asChild>
                <div
                  className='cursor-pointer rounded-full bg-black/30 p-1.5 transition-all hover:bg-black/60'
                  role='button'
                  aria-label='More options'
                  tabIndex={-1}
                >
                  <MoreVertical className='h-4 w-4 text-white' />
                </div>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align='end' className='w-56' onClick={(e) => e.stopPropagation()}>
              {renderMenuItems(image)}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {image.isVideo && (
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 opacity-80 transition-opacity'>
            <Play className='h-6 w-6 fill-white text-white' />
          </div>
        )}
        {showFileName && (
          <div className='absolute right-0 bottom-0 left-0 bg-black/60 px-2 py-1.5 text-xs text-white'>
            <div className='truncate' title={image.imageName}>
              {image.imageName}
            </div>
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
  folderGridHeight?: number
  maxImageWidth: number
  showFileName?: boolean
  focusedIndex?: number
  selectedImageKeys?: Set<string>
  imageRefs?: RefObject<Map<number, HTMLDivElement>>
  onImageKeyDown?: (event: React.KeyboardEvent, index: number) => void
  onImageClick?: (imageKey: string, position: Position, index: number) => void
  onImageSelectionToggle?: (imageKey: string, index: number, event: React.MouseEvent) => void
  renderMenuItems?: (image: GalleryImage) => React.ReactNode
  onVisibleRangeChange?: (startIndex: number, endIndex: number, firstVisibleIndex: number) => void
}

export const ImageGrid = ({
  images,
  aspectRatio,
  width,
  scrollTop,
  folderGridHeight = 0,
  maxImageWidth,
  showFileName = false,
  focusedIndex = -1,
  selectedImageKeys,
  imageRefs,
  onImageKeyDown,
  onImageClick,
  onImageSelectionToggle,
  renderMenuItems,
  onVisibleRangeChange,
}: ImageGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Dynamically calculate the number of columns based on maxImageWidth prop
  const columnCount = Math.max(2, Math.floor(width / maxImageWidth))
  const columnWidth = width / columnCount
  const rowHeight = columnWidth / aspectRatio

  const rowCount = Math.ceil(images.length / columnCount)
  const totalHeight = rowCount * rowHeight

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight)
  const overscanCount = visibleRowsCount
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount

  // Adjust scroll position to account for folder grid height
  const adjustedScrollTop = Math.max(0, scrollTop - folderGridHeight)

  // Determine which images should be rendered based on scroll position
  const startImageIndex = Math.max(
    0,
    Math.floor(adjustedScrollTop / rowHeight - overscanCount) * columnCount,
  )
  const endImageIndex = Math.min(images.length, startImageIndex + totalRenderedRows * columnCount)

  // Calculate the first fully visible image (not in the overscan buffer)
  const firstVisibleImageIndex = Math.min(
    Math.max(0, Math.floor(adjustedScrollTop / rowHeight) * columnCount),
    images.length - 1,
  )

  // Notify parent of visible range changes
  // Use a ref to track the callback to avoid infinite loops
  const onVisibleRangeChangeRef = useRef(onVisibleRangeChange)
  useEffect(() => {
    onVisibleRangeChangeRef.current = onVisibleRangeChange
  }, [onVisibleRangeChange])

  useEffect(() => {
    if (onVisibleRangeChangeRef.current && images.length > 0) {
      onVisibleRangeChangeRef.current(startImageIndex, endImageIndex, firstVisibleImageIndex)
    }
  }, [startImageIndex, endImageIndex, firstVisibleImageIndex, images.length])

  const visibleImages: React.ReactElement[] = []
  for (let i = startImageIndex; i < endImageIndex; i++) {
    const rowIndex = Math.floor(i / columnCount)
    const columnIndex = i % columnCount
    const image = images[i]

    if (image) {
      const imageKey = image.imageKey
      const isSelected = selectedImageKeys?.has(imageKey) || false

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
          firstVisibleImageIndex={firstVisibleImageIndex}
          showFileName={showFileName}
          isSelected={isSelected}
          onImageClick={onImageClick}
          onSelectionToggle={onImageSelectionToggle}
          renderMenuItems={renderMenuItems}
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
