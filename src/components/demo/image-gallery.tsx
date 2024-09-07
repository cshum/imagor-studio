import { useCallback } from 'react';

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
  const columnCount = Math.max(2, Math.floor(width / 300));
  const columnWidth = width / columnCount;
  const rowHeight = columnWidth / aspectRatio;

  const rowCount = Math.ceil(images.length / columnCount);
  const totalHeight = rowCount * rowHeight;

  const visibleRowsCount = Math.ceil(window.innerHeight / rowHeight);
  const overscanCount = 2;
  const totalRenderedRows = visibleRowsCount + 2 * overscanCount;

  const renderRow = useCallback(
    (rowIndex: number) => {
      const startImageIndex = rowIndex * columnCount;
      return (
        <div
          key={rowIndex}
          className="flex absolute w-full"
          style={{
            height: `${rowHeight}px`,
            transform: `translateY(${rowIndex * rowHeight}px)`,
            willChange: 'transform',
          }}
        >
          {Array.from({ length: columnCount }, (_, columnIndex) => {
            const imageIndex = startImageIndex + columnIndex;
            if (imageIndex >= images.length) return null;
            const image = images[imageIndex];
            return (
              <div
                key={columnIndex}
                className="p-2 box-border"
                style={{ width: `${columnWidth}px`, height: `${rowHeight}px` }}
              >
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden transition-transform duration-300 group-[.not-scrolling]:hover:scale-105">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    },
    [images, columnCount, rowHeight, columnWidth]
  );

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
      className={`relative w-full overflow-hidden ${isScrolling ? '' : 'not-scrolling'} group`}
      style={{ height: `${totalHeight}px` }}
    >
      {visibleRows()}
    </div>
  );
};
