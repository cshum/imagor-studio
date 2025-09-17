import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, FileImage, Move, Palette, RotateCw, Scissors } from 'lucide-react'

import { ColorControls } from '@/components/image-editor/controls/color-controls'
import { DimensionControls } from '@/components/image-editor/controls/dimension-controls'
import { OutputControls } from '@/components/image-editor/controls/output-controls'
import { SimpleCropControls } from '@/components/image-editor/controls/simple-crop-controls'
import { TransformControls } from '@/components/image-editor/controls/transform-controls'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { ImageTransformState } from '@/hooks/use-image-transform'
import type { EditorOpenSections } from '@/loaders/image-editor-loader'

interface TransformControlsContentProps {
  params: ImageTransformState
  aspectLocked: boolean
  originalAspectRatio: number | null
  originalDimensions: { width: number; height: number }
  openSections: EditorOpenSections
  onOpenSectionsChange: (sections: EditorOpenSections) => void
  onUpdateParams: (
    updates: Partial<ImageTransformState>,
    options?: { respectAspectLock?: boolean },
  ) => void
  onToggleAspectLock: () => void
}

export function TransformControlsContent({
  params,
  aspectLocked,
  originalAspectRatio,
  originalDimensions,
  openSections,
  onOpenSectionsChange,
  onUpdateParams,
  onToggleAspectLock,
}: TransformControlsContentProps) {
  const { t } = useTranslation()

  const handleSectionToggle = useCallback(
    (section: keyof EditorOpenSections, open: boolean) => {
      const newSections = { ...openSections, [section]: open }
      onOpenSectionsChange(newSections)
    },
    [openSections, onOpenSectionsChange],
  )

  const CollapsibleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />

  return (
    <div className='space-y-4'>
      {/* Dimensions & Resize */}
      <Card>
        <Collapsible
          open={openSections.dimensions}
          onOpenChange={(open) => handleSectionToggle('dimensions', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left p-4'>
            <div className='flex items-center gap-2'>
              <Move className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.dimensionsResize')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.dimensions} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <DimensionControls
              params={params}
              aspectLocked={aspectLocked}
              originalAspectRatio={originalAspectRatio}
              onUpdateParams={onUpdateParams}
              onToggleAspectLock={onToggleAspectLock}
            />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Output & Compression */}
      <Card>
        <Collapsible
          open={openSections.output}
          onOpenChange={(open) => handleSectionToggle('output', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left p-4'>
            <div className='flex items-center gap-2'>
              <FileImage className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.outputCompression')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.output} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <OutputControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Color & Effects */}
      <Card>
        <Collapsible
          open={openSections.effects}
          onOpenChange={(open) => handleSectionToggle('effects', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left p-4'>
            <div className='flex items-center gap-2'>
              <Palette className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.colorEffects')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.effects} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <ColorControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Transform & Rotate */}
      <Card>
        <Collapsible
          open={openSections.transform}
          onOpenChange={(open) => handleSectionToggle('transform', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left p-4'>
            <div className='flex items-center gap-2'>
              <RotateCw className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.transformRotate')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.transform} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <TransformControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Crop & Trim */}
      <Card>
        <Collapsible
          open={openSections.crop}
          onOpenChange={(open) => handleSectionToggle('crop', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left p-4'>
            <div className='flex items-center gap-2'>
              <Scissors className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.cropTrim')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.crop} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <SimpleCropControls
              params={params}
              originalDimensions={originalDimensions}
              onUpdateParams={onUpdateParams}
            />
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
