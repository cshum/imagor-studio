import { useTranslation } from 'react-i18next'

import { ScrollArea } from '@/components/ui/scroll-area'
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export interface ImageInfo {
  exif?: Record<string, string>
  // Add other image information fields here
}

export interface ImageViewInfoProps {
  imageInfo?: ImageInfo
}

export const ImageViewInfo = ({ imageInfo }: ImageViewInfoProps) => {
  const { t } = useTranslation()

  return (
    <SheetContent className='w-[300px] pr-0 sm:w-[300px]' side='left' hideOverlay>
      <SheetHeader className='text-left'>
        <SheetTitle>{t('imageInformation')}</SheetTitle>
      </SheetHeader>
      <ScrollArea className='mt-4 h-[calc(100vh-80px)] pr-6'>
        {imageInfo?.exif ? (
          Object.entries(imageInfo.exif).map(([key, value]) => (
            <div key={key} className='mb-2'>
              <span className='font-semibold'>{key}:</span> {value}
            </div>
          ))
        ) : (
          <p>{t('noImageInfo')}</p>
        )}
      </ScrollArea>
    </SheetContent>
  )
}
