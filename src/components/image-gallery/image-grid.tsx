import { useCallback, useEffect } from 'react'

export interface ImageProps {
  id: string;
  src: string;
  alt: string;
}

interface ImageGridProps {
  images: ImageProps[];
  aspectRatio: number;
  width: number;
  scrollTop: number;
  maxImageWidth: number;
  isScrolling: boolean;
  onRendered?: () => void;
  onImageClick?: (image: ImageProps, position: { top: number; left: number; width: number; height: number }) => void;
}

export const ImageGrid = ({
                            images,
                            aspectRatio,
                            width,
                            scrollTop,
                            maxImageWidth,
                            isScrolling,
                            onRendered,
                            onImageClick,
                          }: ImageGridProps) => {
  // Dynamically calculate the number of columns based on maxImageWidth prop
  const columnCount = Math.max(2, Math.floor(width / maxImageWidth))
  const columnWidth = width / columnCount
  const rowHeight = columnWidth / aspectRatio

  const rowCount = Math.ceil(images.length / columnCount)
  const totalHeight = rowCount * rowHeight

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight)
  // const overscanCount = 2
  const overscanCount = visibleRowsCount
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount

  // Notify that the grid has been rendered
  useEffect(() => {
    if (onRendered) {
      onRendered() // Callback to notify when the grid has rendered
    }
  }, [onRendered])

  // Render individual images with correct positioning
  const renderImage = useCallback(
    (imageIndex: number) => {
      const rowIndex = Math.floor(imageIndex / columnCount)
      const columnIndex = imageIndex % columnCount

      const image = images[imageIndex]
      if (!image) return null

      const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (onImageClick) {
          const rect = e.currentTarget.getBoundingClientRect();
          onImageClick(image, {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      };

      return (
        <div
          key={image.id}
          className="absolute box-border p-1 md:p-2 cursor-pointer"
          style={{
            width: `${columnWidth}px`,
            height: `${rowHeight}px`,
            transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
            willChange: 'transform',
          }}
          onClick={handleClick}
        >
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden transition-transform duration-300 group-[.not-scrolling]:hover:scale-105">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )
    },
    [images, columnCount, columnWidth, rowHeight, onImageClick],
  )

  // Determine which images should be rendered based on scroll position
  const startImageIndex = Math.max(0, Math.floor(scrollTop / rowHeight - overscanCount) * columnCount)
  const endImageIndex = Math.min(images.length, startImageIndex + totalRenderedRows * columnCount)

  const visibleImages = useCallback(() => {
    const imagesToRender = []
    for (let i = startImageIndex; i < endImageIndex; i++) {
      imagesToRender.push(renderImage(i))
    }
    return imagesToRender
  }, [startImageIndex, endImageIndex, renderImage])

  return (
    <div
      className={`relative w-full overflow-hidden ${isScrolling ? '' : 'not-scrolling'} group`}
      style={{ height: `${totalHeight}px` }}
    >
      {visibleImages()}
    </div>
  )
}
