import React, { useState } from 'react'
import { Play } from 'lucide-react'

import { GalleryImage, Position } from '@/components/image-gallery/image-view.tsx'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { getFullImageUrl } from '@/lib/api-utils'

// Re-export for backward compatibility
export type { ContextMenuData } from '@/components/image-gallery/image-context-menu'

interface ImageCellProps {
  image: GalleryImage
  columnWidth: number
  rowHeight: number
  rowIndex: number
  columnIndex: number
  onImageClick?: (image: GalleryImage, position: Position) => void
  onContextMenu?: (image: GalleryImage, position: Position) => void
}

const ImageCell = ({
  image,
  columnWidth,
  rowHeight,
  rowIndex,
  columnIndex,
  onImageClick,
  onContextMenu,
}: ImageCellProps) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onImageClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      onImageClick(image, {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onContextMenu) {
      const rect = e.currentTarget.getBoundingClientRect()
      onContextMenu(image, {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }
  }

  return (
    <div
      key={image.imageKey}
      data-image-key={image.imageKey}
      className='absolute box-border cursor-pointer p-1 md:p-1.5'
      style={{
        width: `${columnWidth}px`,
        height: `${rowHeight}px`,
        transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
        willChange: 'transform',
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className='relative h-full w-full overflow-hidden rounded-md bg-gray-200 transition-transform duration-300 group-[.not-scrolling]:hover:scale-105 dark:bg-gray-700'>
        <img
          src={getFullImageUrl(image.imageSrc)}
          alt={image.imageName}
          className='h-full w-full object-cover'
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
  onImageClick?: (image: GalleryImage, position: Position) => void
  contextMenuContent?: (image: GalleryImage, position: Position) => React.ReactNode
}

export const ImageGrid = ({
  images,
  aspectRatio,
  width,
  scrollTop,
  maxImageWidth,
  onImageClick,
  contextMenuContent,
}: ImageGridProps) => {
  const [selectedImage, setSelectedImage] = useState<{
    image: GalleryImage
    position: Position
  } | null>(null)

  const handleContextMenu = (image: GalleryImage, position: Position) => {
    setSelectedImage({ image, position })
  }

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
          onImageClick={onImageClick}
          onContextMenu={handleContextMenu}
        />,
      )
    }
  }

  const gridContent = (
    <div className={`group relative w-full overflow-hidden`} style={{ height: `${totalHeight}px` }}>
      {visibleImages}
    </div>
  )

  // If no context menu content provided, return grid without context menu
  if (!contextMenuContent) {
    return gridContent
  }

  // Wrap with ContextMenu when contextMenuContent is provided
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{gridContent}</ContextMenuTrigger>
      <ContextMenuContent>
        {selectedImage && contextMenuContent(selectedImage.image, selectedImage.position)}
      </ContextMenuContent>
    </ContextMenu>
  )
}
