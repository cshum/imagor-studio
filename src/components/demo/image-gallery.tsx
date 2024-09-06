import { useState, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface Image {
  id: string;
}

interface ImageGalleryProps {
  imageCount: number;
  columnCount: number;
  rowHeight: number;
}

export const ImageGallery = ({ imageCount, columnCount, rowHeight }: ImageGalleryProps) => {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    const newImages: Image[] = Array.from({ length: imageCount }, (_, i) => ({
      id: `${i + 1}`,
    }));
    setImages(newImages);
  }, [imageCount]);

  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= images.length) return null;

    const image = images[index];

    return (
      <div className="p-2 box-border" style={style}>
        <img
          src={`https://picsum.photos/id/${image.id}/400/300`}
          alt={`Random image ${image.id}`}
          className="w-full h-full object-cover rounded-md shadow-md transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-transparent">
      <AutoSizer>
        {({ height, width }) => {
          const columnWidth = width / columnCount;
          const rowCount = Math.ceil(images.length / columnCount);

          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
};
