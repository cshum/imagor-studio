import { ChevronDown, Move, Palette, Scissors } from 'lucide-react'

import { CropControls } from '@/components/image-editor/controls/crop-controls'
import { DimensionControls } from '@/components/image-editor/controls/dimension-controls'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { ImageTransformState } from '@/hooks/use-image-transform'

interface TransformControlsContentProps {
  params: ImageTransformState
  aspectLocked: boolean
  originalAspectRatio: number | null
  onUpdateParam: <K extends keyof ImageTransformState>(
    key: K,
    value: ImageTransformState[K],
  ) => void
  onToggleAspectLock: () => void
}

export function TransformControlsContent({
  params,
  aspectLocked,
  originalAspectRatio,
  onUpdateParam,
  onToggleAspectLock,
}: TransformControlsContentProps) {
  return (
    <div className='space-y-4'>
      {/* Dimensions & Resize */}
      <Card className='p-4'>
        <Collapsible defaultOpen>
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <Move className='h-4 w-4' />
              <span className='font-medium'>Dimensions & Resize</span>
            </div>
            <ChevronDown className='h-4 w-4' />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
            <DimensionControls
              params={params}
              aspectLocked={aspectLocked}
              originalAspectRatio={originalAspectRatio}
              onUpdateParam={onUpdateParam}
              onToggleAspectLock={onToggleAspectLock}
            />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Crop & Trim */}
      <Card className='p-4'>
        <Collapsible>
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <Scissors className='h-4 w-4' />
              <span className='font-medium'>Crop & Trim</span>
            </div>
            <ChevronDown className='h-4 w-4' />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
            <CropControls params={params} onUpdateParam={onUpdateParam} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Color & Effects - Placeholder for Phase 4 */}
      <Card className='p-4'>
        <Collapsible>
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <Palette className='h-4 w-4' />
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
  )
}
