import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, Copy, RotateCcw, Settings } from 'lucide-react'

import { CropControls } from '@/components/image-editor/controls/crop-controls'
import { DimensionControls } from '@/components/image-editor/controls/dimension-controls'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useImageTransform } from '@/hooks/use-image-transform'
import { getFullImageUrl } from '@/lib/api-utils'

interface ImageEditorPageProps {
  galleryKey: string
  imageKey: string
}

export function ImageEditorPage({ galleryKey, imageKey }: ImageEditorPageProps) {
  const navigate = useNavigate()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  const {
    params,
    previewUrl,
    aspectLocked,
    originalAspectRatio,
    isLoading,
    error,
    updateParam,
    resetParams,
    setOriginalDimensions,
    toggleAspectLock,
  } = useImageTransform({
    galleryKey,
    imageKey,
    onPreviewUpdate: (url) => {
      console.log('Preview updated:', url)
    },
    onError: (error) => {
      console.error('Transform error:', error)
    },
  })

  const handleBack = () => {
    if (galleryKey) {
      navigate({
        to: '/gallery/$galleryKey/$imageKey',
        params: { galleryKey, imageKey },
      })
    } else {
      navigate({
        to: '/$imageKey',
        params: { imageKey },
      })
    }
  }

  const handleCopyUrl = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(getFullImageUrl(previewUrl))
      // TODO: Add toast notification
    }
  }

  const handleApplyAndReturn = () => {
    // TODO: Save transform settings and return to gallery
    handleBack()
  }

  const imagePath = galleryKey ? `${galleryKey}/${imageKey}` : imageKey

  return (
    <div className='bg-background flex h-screen'>
      {/* Preview Area - 70% */}
      <div className='flex flex-1 flex-col'>
        {/* Header */}
        <div className='flex items-center gap-2 border-b p-4'>
          <Button variant='ghost' size='sm' onClick={handleBack}>
            <ChevronLeft className='mr-1 h-4 w-4' />
            Back to Gallery
          </Button>
          <Separator orientation='vertical' className='h-4' />
          <span className='text-muted-foreground text-sm'>Editing: {imagePath}</span>

          {/* Mobile Controls Trigger */}
          {isMobile && (
            <div className='ml-auto'>
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <Settings className='mr-1 h-4 w-4' />
                    Controls
                  </Button>
                </SheetTrigger>
                <SheetContent side='right' className='flex w-80 flex-col sm:w-96'>
                  <SheetHeader>
                    <SheetTitle>Transform Controls</SheetTitle>
                  </SheetHeader>

                  {/* Reset Button */}
                  <div className='flex justify-end border-b pb-4'>
                    <Button variant='ghost' size='sm' onClick={resetParams}>
                      <RotateCcw className='mr-1 h-4 w-4' />
                      Reset All
                    </Button>
                  </div>

                  {/* Scrollable Controls */}
                  <div className='flex-1 space-y-4 overflow-y-auto p-4'>
                    {/* Dimensions & Resize */}
                    <Card className='p-4'>
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                          <div className='flex items-center gap-2'>
                            <span>📐</span>
                            <span className='font-medium'>Dimensions & Resize</span>
                          </div>
                          <ChevronDown className='h-4 w-4' />
                        </CollapsibleTrigger>
                        <CollapsibleContent className='mt-4'>
                          <DimensionControls
                            params={params}
                            aspectLocked={aspectLocked}
                            originalAspectRatio={originalAspectRatio}
                            onUpdateParam={updateParam}
                            onToggleAspectLock={toggleAspectLock}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>

                    {/* Crop & Trim */}
                    <Card className='p-4'>
                      <Collapsible>
                        <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                          <div className='flex items-center gap-2'>
                            <span>✂️</span>
                            <span className='font-medium'>Crop & Trim</span>
                          </div>
                          <ChevronDown className='h-4 w-4' />
                        </CollapsibleTrigger>
                        <CollapsibleContent className='mt-4'>
                          <CropControls params={params} onUpdateParam={updateParam} />
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>

                    {/* Color & Effects - Placeholder for Phase 4 */}
                    <Card className='p-4'>
                      <Collapsible>
                        <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                          <div className='flex items-center gap-2'>
                            <span>🎨</span>
                            <span className='font-medium'>Color & Effects</span>
                          </div>
                          <ChevronDown className='h-4 w-4' />
                        </CollapsibleTrigger>
                        <CollapsibleContent className='mt-4'>
                          <div className='text-muted-foreground bg-muted/50 rounded p-2 text-sm'>
                            Color and effects controls will be available in Phase 4.
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  </div>

                  {/* Action Buttons - Fixed at bottom */}
                  <div className='space-y-2 border-t p-4'>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleCopyUrl}
                        disabled={!previewUrl}
                        className='flex-1'
                      >
                        <Copy className='mr-1 h-4 w-4' />
                        Copy URL
                      </Button>
                    </div>
                    <Button onClick={handleApplyAndReturn} disabled={isLoading} className='w-full'>
                      Apply & Return
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <PreviewArea
          previewUrl={previewUrl}
          isLoading={isLoading}
          error={error}
          galleryKey={galleryKey}
          imageKey={imageKey}
          onImageLoad={setOriginalDimensions}
        />
      </div>

      {/* Transform Panel - 30% (Hidden on mobile) */}
      {!isMobile && (
        <div className='bg-background flex w-80 flex-col border-l'>
          {/* Panel Header */}
          <div className='border-b p-4'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>Transform Controls</h2>
              <Button variant='ghost' size='sm' onClick={resetParams}>
                <RotateCcw className='mr-1 h-4 w-4' />
                Reset All
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='flex-1 space-y-4 overflow-y-auto p-4'>
            {/* Dimensions & Resize */}
            <Card className='p-4'>
              <Collapsible defaultOpen>
                <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                  <div className='flex items-center gap-2'>
                    <span>📐</span>
                    <span className='font-medium'>Dimensions & Resize</span>
                  </div>
                  <ChevronDown className='h-4 w-4' />
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-4'>
                  <DimensionControls
                    params={params}
                    aspectLocked={aspectLocked}
                    originalAspectRatio={originalAspectRatio}
                    onUpdateParam={updateParam}
                    onToggleAspectLock={toggleAspectLock}
                  />
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Crop & Trim */}
            <Card className='p-4'>
              <Collapsible>
                <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                  <div className='flex items-center gap-2'>
                    <span>✂️</span>
                    <span className='font-medium'>Crop & Trim</span>
                  </div>
                  <ChevronDown className='h-4 w-4' />
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-4'>
                  <CropControls params={params} onUpdateParam={updateParam} />
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Color & Effects - Placeholder for Phase 4 */}
            <Card className='p-4'>
              <Collapsible>
                <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                  <div className='flex items-center gap-2'>
                    <span>🎨</span>
                    <span className='font-medium'>Color & Effects</span>
                  </div>
                  <ChevronDown className='h-4 w-4' />
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-4'>
                  <div className='text-muted-foreground bg-muted/50 rounded p-2 text-sm'>
                    Color and effects controls will be available in Phase 4.
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className='bg-background border-t p-4'>
            <div className='space-y-2'>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopyUrl}
                  disabled={!previewUrl}
                  className='flex-1'
                >
                  <Copy className='mr-1 h-4 w-4' />
                  Copy URL
                </Button>
              </div>
              <Button onClick={handleApplyAndReturn} disabled={isLoading} className='w-full'>
                Apply & Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
