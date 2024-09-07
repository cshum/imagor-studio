import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/providers/theme-provider.tsx';

interface Image {
  id: string;
  isLoaded: boolean;
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
  const { theme } = useTheme();

  useEffect(() => {
    const newImages: Image[] = Array.from({ length: imageCount }, (_, i) => ({
      id: `${i + 1}`,
      isLoaded: false,
    }));
    setImages(newImages);
  }, [imageCount]);

  const rowCount = Math.ceil(images.length / columnCount);
  const totalHeight = rowCount * rowHeight;
  const columnWidth = width / columnCount;

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight);
  const overscanCount = 3;
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount;

  const handleImageLoad = useCallback((index: number) => {
    setImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index] = { ...newImages[index], isLoaded: true };
      return newImages;
    });
  }, []);

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
          const placeholderColor = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';
          return (
            <div key={columnIndex} className="p-2 box-border" style={{ width: `${columnWidth}px`, height: `${rowHeight}px` }}>
              {image.isLoaded ? (
                <img
                  src={`https://picsum.photos/id/${image.id}/400/300`}
                  alt={`Random image ${image.id}`}
                  className="w-full h-full object-cover rounded-md shadow-md transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <>
                  <div className={`w-full h-full ${placeholderColor} rounded-md`} />
                  <img
                    src={`https://picsum.photos/id/${image.id}/400/300`}
                    alt={`Random image ${image.id}`}
                    className="hidden"
                    onLoad={() => handleImageLoad(imageIndex)}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [images, columnCount, rowHeight, columnWidth, theme, handleImageLoad]);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanCount);
  const endIndex = Math.min(rowCount, startIndex + totalRenderedRows);

  const visibleRows = useCallback(() => {
    const rows = [];
    for (let i = startIndex; i < endIndex; i++) {
      rows.push(renderRow(i));
    }
    return rows;
  }, [startIndex, endIndex, renderRow]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${totalHeight}px`, position: 'relative', width: '100%', overflow: 'hidden' }}
    >
      {visibleRows()}
    </div>
  );
};
