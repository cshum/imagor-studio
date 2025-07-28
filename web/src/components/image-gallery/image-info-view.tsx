import { ScrollArea } from '@/components/ui/scroll-area'
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export interface ImageInfo {
  exif?: Record<string, string>
  // Add other image information fields here
}

export interface ImageInfoViewProps {
  imageInfo?: ImageInfo
}

export const ImageInfoView = ({ imageInfo }: ImageInfoViewProps) => {
  return (
    <SheetContent className='w-[300px] sm:w-[300px]' side='left' hideOverlay>
      <SheetHeader className='text-left'>
        <SheetTitle>Image Information</SheetTitle>
      </SheetHeader>
      <ScrollArea className='mt-4 h-[calc(100vh-80px)]'>
        {imageInfo?.exif ? (
          Object.entries(imageInfo.exif).map(([key, value]) => (
            <div key={key} className='mb-2'>
              <span className='font-semibold'>{key}:</span> {value}
            </div>
          ))
        ) : (
          <p>No image information available.</p>
        )}
      </ScrollArea>
    </SheetContent>
  )
}
