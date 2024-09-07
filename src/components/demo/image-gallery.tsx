import { useCallback } from 'react'

interface Image {
  id: string;
  src: string;
  alt: string;
  isLoaded: boolean;
}

interface ImageGalleryProps {
  images: Image[];
  aspectRatio: number;
  width: number;
  scrollTop: number;
  isScrolling: boolean;
}

export const ImageGallery = ({
                               images,
                               aspectRatio,
                               width,
                               scrollTop,
                               isScrolling,
                             }: ImageGalleryProps) => {
  // Dynamically calculate the number of columns based on image width
  const columnCount = Math.max(2, Math.floor(width / 300))
  const columnWidth = width / columnCount
  const rowHeight = columnWidth / aspectRatio

  const rowCount = Math.ceil(images.length / columnCount)
  const totalHeight = rowCount * rowHeight

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight)
  const overscanCount = 3 // Allow overscanning to improve scrolling performance
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount

  // Render individual images with correct positioning
  const renderImage = useCallback(
    (imageIndex: number) => {
      const rowIndex = Math.floor(imageIndex / columnCount)
      const columnIndex = imageIndex % columnCount

      const image = images[imageIndex]
      if (!image) return null

      return (
        <div
          key={image.id}
          className="absolute p-2 box-border"
          style={{
            width: `${columnWidth}px`,
            height: `${rowHeight}px`,
            transform: `translate3d(${columnIndex * columnWidth}px, ${rowIndex * rowHeight}px, 0)`,
            willChange: 'transform',
          }}
        >
          <div
            className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden transition-transform duration-300 group-[.not-scrolling]:hover:scale-105">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )
    },
    [images, columnCount, columnWidth, rowHeight],
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
