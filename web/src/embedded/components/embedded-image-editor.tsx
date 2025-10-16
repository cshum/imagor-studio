import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Download, RotateCcw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { ImageEditorControls } from '@/components/image-editor/imagor-editor-controls'
import { PreviewArea } from '@/components/image-editor/preview-area'
import { LoadingBar } from '@/components/loading-bar'
import { Button } from '@/components/ui/button'
import { CopyUrlDialog } from '@/components/ui/copy-url-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { ImageEditor, type ImageEditorState } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

interface EmbeddedImageEditorProps {
  imagePath: string
  token?: string
}

export function EmbeddedImageEditor({ imagePath, token }: EmbeddedImageEditorProps) {
  const { t } = useTranslation()
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [copyUrlDialogOpen, setCopyUrlDialogOpen] = useState(false)
  const [copyUrl, setCopyUrl] = useState('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [editorOpenSections, setEditorOpenSections] = useState<Record<string, boolean>>({
    dimensions: true,
    crop: false,
    filters: false,
    transform: false,
    output: false,
  })
  const isMobile = !useBreakpoint('md') // Mobile when screen < 768px

  // Image transform state
  const [params, setParams] = useState<ImageEditorState>(() => ({
    width: undefined,
    height: undefined,
  }))
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [aspectLocked, setAspectLocked] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [previewMaxDimensions, setPreviewMaxDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const [resetCounter, setResetCounter] = useState(0)
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  const transformRef = useRef<ImageEditor | undefined>(undefined)

  // Create image URL with token if provided
  const imageUrl = useMemo(() => {
    const baseUrl = `/imagor/unsafe/${imagePath}`
    return token ? `${baseUrl}?token=${token}` : baseUrl
  }, [imagePath, token])

  // Load original image dimensions
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height }
      setOriginalDimensions(dimensions)
      setParams(prev => ({
        ...prev,
        width: dimensions.width,
        height: dimensions.height,
      }))
    }
    img.onerror = () => {
      setError(new Error('Failed to load image'))
    }
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    if (!originalDimensions) return

    const transform = new ImageEditor(
      {
        galleryKey: '', // Empty for embedded mode
        imageKey: imagePath,
        originalDimensions,
        previewMaxDimensions: previewMaxDimensions ?? undefined,
      },
      {
        onPreviewUpdate: setPreviewUrl,
        onError: setError,
        onStateChange: setParams,
        onLoadingChange: setIsLoading,
      },
    )
    transformRef.current = transform
    return () => {
      transform.destroy()
    }
  }, [imagePath, originalDimensions, previewMaxDimensions])

  const originalAspectRatio = originalDimensions 
    ? originalDimensions.width / originalDimensions.height 
    : 1

  const updateParams = (
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ) => {
    transformRef.current?.updateParams(updates, options)
  }

  const resetParams = () => {
    transformRef.current?.resetParams()
    setResetCounter((prev) => prev + 1)
  }

  const toggleAspectLock = () => {
    transformRef.current?.toggleAspectLock()
    setAspectLocked(transformRef.current?.isAspectLocked() ?? true)
  }

  const getCopyUrl = async () => {
    return transformRef.current?.getCopyUrl() ?? ''
  }

  const handleDownload = async () => {
    return (
      transformRef.current?.handleDownload() ?? {
        success: false,
        error: 'Transform not initialized',
      }
    )
  }

  const handleCopyUrlClick = async () => {
    const url = await getCopyUrl()
    setCopyUrl(url)
    setCopyUrlDialogOpen(true)
  }

  const handleDownloadClick = async () => {
    const result = await handleDownload()
    if (!result.success) {
      toast.error(result.error || t('imageEditor.page.failedToDownload'))
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!originalDimensions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading image...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-background ios-no-drag flex overflow-hidden select-none',
        isMobile && 'min-h-screen-safe',
        !isMobile && 'h-screen',
      )}
    >
      {/* Loading Bar */}
      <LoadingBar isLoading={isLoading} />

      {/* Preview Area  */}
      <div className='ios-preview-container-fix flex flex-1 flex-col'>
        {/* Header */}
        <div className='flex items-center gap-2 border-b p-4'>
          {/* Centered title */}
          <div className='flex flex-1 justify-center'>
            <h1 className='text-foreground text-lg font-semibold'>Image Editor</h1>
          </div>

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
                <SheetContent
                  side='right'
                  hideClose={true}
                  className='flex w-full flex-col gap-0 p-0 sm:w-96'
                >
                  <SheetHeader className='border-b p-4'>
                    <div className='flex items-center justify-between'>
                      <Button variant='ghost' size='sm' onClick={() => setMobileSheetOpen(false)}>
                        Close
                      </Button>

                      <SheetTitle>Controls</SheetTitle>

                      <Button variant='outline' size='sm' onClick={resetParams}>
                        <RotateCcw className='mr-1 h-4 w-4' />
                        Reset
                      </Button>
                    </div>
                  </SheetHeader>

                  {/* Scrollable Controls */}
                  <div className='flex-1 touch-pan-y overflow-y-auto p-4 select-text'>
                    <ImageEditorControls
                      key={resetCounter}
                      params={params}
                      aspectLocked={aspectLocked}
                      originalAspectRatio={originalAspectRatio}
                      openSections={editorOpenSections}
                      onOpenSectionsChange={setEditorOpenSections}
                      onUpdateParams={updateParams}
                      onToggleAspectLock={toggleAspectLock}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <PreviewArea
          previewUrl={previewUrl || imageUrl}
          error={error}
          galleryKey=''
          imageKey={imagePath}
          originalDimensions={originalDimensions}
          onLoad={() => setIsLoading(false)}
          onCopyUrl={handleCopyUrlClick}
          onDownload={handleDownloadClick}
          onPreviewDimensionsChange={setPreviewMaxDimensions}
        />
      </div>

      {/* Transform Panel (Hidden on mobile) */}
      {!isMobile && (
        <div className='bg-background flex w-100 flex-col border-l'>
          {/* Panel Header */}
          <div className='border-b p-4'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>Controls</h2>
              <Button variant='outline' size='sm' onClick={resetParams}>
                <RotateCcw className='mr-1 h-4 w-4' />
                Reset
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='flex-1 touch-pan-y overflow-y-auto p-4 select-text'>
            <ImageEditorControls
              key={resetCounter}
              params={params}
              aspectLocked={aspectLocked}
              originalAspectRatio={originalAspectRatio}
              openSections={editorOpenSections}
              onOpenSectionsChange={setEditorOpenSections}
              onUpdateParams={updateParams}
              onToggleAspectLock={toggleAspectLock}
            />
          </div>

          {/* Action Buttons */}
          <div className='bg-background border-t p-4'>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={handleDownloadClick} className='flex-1'>
                <Download className='mr-1 h-4 w-4' />
                Download
              </Button>
              <Button variant='outline' size='sm' onClick={handleCopyUrlClick} className='flex-1'>
                <Copy className='mr-1 h-4 w-4' />
                Copy URL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy URL Dialog */}
      <CopyUrlDialog
        open={copyUrlDialogOpen}
        onOpenChange={setCopyUrlDialogOpen}
        url={copyUrl}
        title="Copy Image URL"
      />
    </div>
  )
}
