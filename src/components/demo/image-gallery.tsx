import React, { useEffect, useMemo, useState } from 'react'

interface Image {
  id: string;
}

interface ImageGalleryProps {
  imageCount: number;
  columnCount: number;
  rowHeight: number;
  width: number;
  scrollTop: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
                                                            imageCount,
                                                            columnCount,
                                                            rowHeight,
                                                            width,
                                                            scrollTop,
                                                          }) => {
  const [images, setImages] = useState<Image[]>([])

  useEffect(() => {
    const newImages: Image[] = Array.from({ length: imageCount }, (_, i) => ({
      id: `${i + 1}`,
    }))
    setImages(newImages)
  }, [imageCount])

  const rowCount = Math.ceil(images.length / columnCount)
  const totalHeight = rowCount * rowHeight
  const columnWidth = width / columnCount

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight) + 2
  const startIndex = Math.floor(scrollTop / rowHeight)

  const visibleRows = useMemo(() => {
    return Array.from({ length: visibleRowsCount }, (_, index) => {
      const rowIndex = startIndex + index
      if (rowIndex >= rowCount) return null

      const startImageIndex = rowIndex * columnCount

      return (
        <div
          key={rowIndex}
          className="flex"
          style={{
            height: rowHeight,
            width: '100%',
            position: 'absolute',
            top: rowIndex * rowHeight,
            left: 0,
          }}
        >
          {Array.from({ length: columnCount }, (_, columnIndex) => {
            const imageIndex = startImageIndex + columnIndex
            if (imageIndex >= images.length) return null
            const image = images[imageIndex]
            return (
              <div key={columnIndex} className="p-2 box-border" style={{ width: `${columnWidth}px` }}>
                <img
                  src={`https://picsum.photos/id/${image.id}/400/300`}
                  alt={`Random image ${image.id}`}
                  className="w-full h-full object-cover rounded-md shadow-md transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>
            )
          })}
        </div>
      )
    }).filter(Boolean)
  }, [images, columnCount, rowHeight, startIndex, rowCount, visibleRowsCount, columnWidth])

  return (
    <div style={{ height: totalHeight, position: 'relative', width: '100%', overflow: 'hidden' }}>
      {visibleRows}
    </div>
  )
}
