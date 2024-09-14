import React from 'react'
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface ImageInfo {
  exif?: Record<string, string>;
  // Add other image information fields here
}

interface ImageInfoViewProps {
  info?: ImageInfo;
}

export const ImageInfoView: React.FC<ImageInfoViewProps> = ({ info }) => {
  return (
    <SheetContent className="w-[300px] sm:w-[300px]" side="left" hideOverlay>
      <SheetHeader className="text-left">
        <SheetTitle>Image Information</SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-80px)] mt-4">
        {info?.exif ? (
          Object.entries(info.exif).map(([key, value]) => (
            <div key={key} className="mb-2">
              <span className="font-semibold">{key}:</span> {value}
            </div>
          ))
        ) : (
          <p>No image information available.</p>
        )}
      </ScrollArea>
    </SheetContent>
  )
}
