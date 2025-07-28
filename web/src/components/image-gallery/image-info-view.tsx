import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface ImageInfo {
  exif?: Record<string, string>;
  // Add other image information fields here
}

interface ImageInfoViewProps {
  imageInfo?: ImageInfo;
}

export const ImageInfoView = ({ imageInfo }: ImageInfoViewProps) => {
  return (
    <SheetContent className="w-[300px] sm:w-[300px]" side="left" hideOverlay>
      <SheetHeader className="text-left">
        <SheetTitle>Image Information</SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-80px)] mt-4">
        {imageInfo?.exif ? (
          Object.entries(imageInfo.exif).map(([key, value]) => (
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
