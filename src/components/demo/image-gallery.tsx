import React, { useState, useEffect, useRef, useCallback } from 'react';

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
                                                            scrollTop
                                                          }) => {
  const [images, setImages] = useState<Image[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newImages: Image[] = Array.from({ length: imageCount }, (_, i) => ({
      id: `${i + 1}`,
    }));
    setImages(newImages);
  }, [imageCount]);

  const rowCount = Math.ceil(images.length / columnCount);
  const totalHeight = rowCount * rowHeight;
  const columnWidth = width / columnCount;

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight);
  const overscanCount = 3; // Number of rows to render above and below the visible area
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount;

  const renderRow = useCallback((rowIndex: number) => {
    const startImageIndex = rowIndex * columnCount;
    return (
      <div
        key={rowIndex}
        className="flex absolute w-full"
        style={{
          height: `${rowHeight}px`,
          transform: `translateY(${rowIndex * rowHeight}px)`,
          willChange: 'transform'
        }}
      >
        {Array.from({ length: columnCount }, (_, columnIndex) => {
          const imageIndex = startImageIndex + columnIndex;
          if (imageIndex >= images.length) return null;
          const image = images[imageIndex];
          return (
            <div key={columnIndex} className="p-2 box-border" style={{ width: `${columnWidth}px` }}>
              <img
                src={`https://picsum.photos/id/${image.id}/400/300`}
                alt={`Random image ${image.id}`}
                className="w-full h-full object-cover rounded-md shadow-md transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </div>
          );
        })}
      </div>
    );
  }, [images, columnCount, rowHeight, columnWidth]);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanCount);
  const endIndex = Math.min(rowCount, startIndex + totalRenderedRows);

  const lastStartIndexRef = useRef<number | null>(null)
  const lastEndIndexRef = useRef<number | null>(null)

  const visibleRows = useCallback(() => {
    const rows = [];
    for (let i = startIndex; i < endIndex; i++) {
      rows.push(renderRow(i));
    }
    if (lastStartIndexRef.current !== startIndex || lastEndIndexRef.current !== endIndex) {
      console.log(lastStartIndexRef.current, lastEndIndexRef.current, startIndex, endIndex)
      // apply rows optimization logic here
      lastStartIndexRef.current = startIndex
      lastEndIndexRef.current = endIndex
    }
    return rows;
  }, [startIndex, endIndex, renderRow]);

  return (
    <div
      ref={containerRef}
      style={{ height: totalHeight, position: 'relative', width: '100%', overflow: 'hidden' }}
    >
      {visibleRows()}
    </div>
  );
};
