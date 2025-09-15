import { useState } from 'react'
import { ChevronDown, ChevronLeft, Copy, Download, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'

interface ImageEditorPageProps {
  galleryKey: string
  imageKey: string
}

export function ImageEditorPage({ galleryKey, imageKey }: ImageEditorPageProps) {
  const [isLoading] = useState(false)

  // Mock transform state - will be replaced with real state management
  const [transforms, setTransforms] = useState({
    width: 800,
    height: 600,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    grayscale: false,
  })

  const handleBack = () => {
    // Navigate back to gallery/image view
    window.history.back()
  }

  const handleReset = () => {
    setTransforms({
      width: 800,
      height: 600,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      grayscale: false,
    })
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
        </div>

        {/* Preview Content */}
        <div className='bg-muted/20 flex flex-1 items-center justify-center p-4'>
          {isLoading ? (
            <div className='space-y-4'>
              <Skeleton className='h-64 w-96' />
              <div className='text-muted-foreground text-center text-sm'>Generating preview...</div>
            </div>
          ) : (
            <div className='relative'>
              {/* Placeholder for actual image preview */}
              <div className='bg-muted border-muted-foreground/25 flex h-64 w-96 items-center justify-center rounded-lg border-2 border-dashed'>
                <div className='text-muted-foreground text-center'>
                  <div className='text-lg font-medium'>Image Preview</div>
                  <div className='text-sm'>
                    {transforms.width} × {transforms.height}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Controls */}
        <div className='bg-background flex items-center justify-between border-t p-4'>
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <span>Original: 1920×1080</span>
            <span>→</span>
            <span>
              Preview: {transforms.width}×{transforms.height}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm'>
              <Copy className='mr-1 h-4 w-4' />
              Copy URL
            </Button>
            <Button variant='outline' size='sm'>
              <Download className='mr-1 h-4 w-4' />
              Download
            </Button>
            <Button size='sm'>Apply & Return</Button>
          </div>
        </div>
      </div>

      {/* Transform Panel - 30% */}
      <div className='bg-background flex w-80 flex-col border-l'>
        {/* Panel Header */}
        <div className='border-b p-4'>
          <div className='flex items-center justify-between'>
            <h2 className='font-semibold'>Transform Controls</h2>
            <Button variant='ghost' size='sm' onClick={handleReset}>
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
              <CollapsibleContent className='mt-4 space-y-4'>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='text-sm font-medium'>Width</label>
                    <input
                      type='number'
                      value={transforms.width}
                      onChange={(e) =>
                        setTransforms((prev) => ({ ...prev, width: parseInt(e.target.value) || 0 }))
                      }
                      className='w-full rounded border px-2 py-1 text-sm'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-medium'>Height</label>
                    <input
                      type='number'
                      value={transforms.height}
                      onChange={(e) =>
                        setTransforms((prev) => ({
                          ...prev,
                          height: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full rounded border px-2 py-1 text-sm'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Fit Mode</label>
                  <div className='flex gap-2'>
                    <Button variant='outline' size='sm'>
                      Fit In
                    </Button>
                    <Button variant='outline' size='sm'>
                      Fill
                    </Button>
                    <Button variant='outline' size='sm'>
                      Stretch
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Color & Effects */}
          <Card className='p-4'>
            <Collapsible>
              <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
                <div className='flex items-center gap-2'>
                  <span>🎨</span>
                  <span className='font-medium'>Color & Effects</span>
                </div>
                <ChevronDown className='h-4 w-4' />
              </CollapsibleTrigger>
              <CollapsibleContent className='mt-4 space-y-4'>
                <div className='space-y-3'>
                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <label className='text-sm font-medium'>Brightness</label>
                      <span className='text-muted-foreground text-xs'>{transforms.brightness}</span>
                    </div>
                    <Slider
                      value={[transforms.brightness]}
                      onValueChange={([value]) =>
                        setTransforms((prev) => ({ ...prev, brightness: value }))
                      }
                      min={-100}
                      max={100}
                      step={1}
                      className='w-full'
                    />
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <label className='text-sm font-medium'>Contrast</label>
                      <span className='text-muted-foreground text-xs'>{transforms.contrast}</span>
                    </div>
                    <Slider
                      value={[transforms.contrast]}
                      onValueChange={([value]) =>
                        setTransforms((prev) => ({ ...prev, contrast: value }))
                      }
                      min={-100}
                      max={100}
                      step={1}
                      className='w-full'
                    />
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <label className='text-sm font-medium'>Saturation</label>
                      <span className='text-muted-foreground text-xs'>{transforms.saturation}</span>
                    </div>
                    <Slider
                      value={[transforms.saturation]}
                      onValueChange={([value]) =>
                        setTransforms((prev) => ({ ...prev, saturation: value }))
                      }
                      min={-100}
                      max={100}
                      step={1}
                      className='w-full'
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <label className='text-sm font-medium'>Grayscale</label>
                    <Toggle
                      pressed={transforms.grayscale}
                      onPressedChange={(pressed) =>
                        setTransforms((prev) => ({ ...prev, grayscale: pressed }))
                      }
                    >
                      {transforms.grayscale ? 'On' : 'Off'}
                    </Toggle>
                  </div>
                </div>
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
                <div className='text-muted-foreground text-sm'>
                  Crop controls will be implemented in Phase 3
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>
    </div>
  )
}
