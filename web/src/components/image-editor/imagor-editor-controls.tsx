import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, FileImage, Move, Palette, RotateCw, Scissors } from 'lucide-react'

import { ColorControl } from '@/components/image-editor/controls/color-control.tsx'
import { DimensionControl } from '@/components/image-editor/controls/dimension-control.tsx'
import { OutputControl } from '@/components/image-editor/controls/output-control.tsx'
import { SimpleCropControl } from '@/components/image-editor/controls/simple-crop-control.tsx'
import { TransformControl } from '@/components/image-editor/controls/transform-control.tsx'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { EditorOpenSections } from '@/lib/editor-open-sections-storage'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface ImageEditorControlsProps {
  params: ImageEditorState
  aspectLocked: boolean
  originalAspectRatio: number | null
  openSections: EditorOpenSections
  onOpenSectionsChange: (sections: EditorOpenSections) => void
  onUpdateParams: (
    updates: Partial<ImageEditorState>,
    options?: { respectAspectLock?: boolean },
  ) => void
  onToggleAspectLock: () => void
  onVisualCropToggle?: (enabled: boolean) => void
  isVisualCropEnabled?: boolean
}

export function ImageEditorControls({
  params,
  aspectLocked,
  originalAspectRatio,
  openSections,
  onOpenSectionsChange,
  onUpdateParams,
  onToggleAspectLock,
  onVisualCropToggle,
  isVisualCropEnabled,
}: ImageEditorControlsProps) {
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
          <CollapsibleTrigger className='flex w-full items-center justify-between p-4 text-left'>
            <div className='flex items-center gap-2'>
              <Move className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.dimensionsResize')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.dimensions} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <DimensionControl
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
          <CollapsibleTrigger className='flex w-full items-center justify-between p-4 text-left'>
            <div className='flex items-center gap-2'>
              <FileImage className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.outputCompression')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.output} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <OutputControl params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Color & Effects */}
      <Card>
        <Collapsible
          open={openSections.effects}
          onOpenChange={(open) => handleSectionToggle('effects', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between p-4 text-left'>
            <div className='flex items-center gap-2'>
              <Palette className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.colorEffects')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.effects} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <ColorControl params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Flip & Rotate */}
      <Card>
        <Collapsible
          open={openSections.transform}
          onOpenChange={(open) => handleSectionToggle('transform', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between p-4 text-left'>
            <div className='flex items-center gap-2'>
              <RotateCw className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.transformRotate')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.transform} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <TransformControl params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Crop & Trim */}
      <Card>
        <Collapsible
          open={openSections.crop}
          onOpenChange={(open) => handleSectionToggle('crop', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between p-4 text-left'>
            <div className='flex items-center gap-2'>
              <Scissors className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.cropTrim')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.crop} />
          </CollapsibleTrigger>
          <CollapsibleContent className='px-4 pb-4'>
            <SimpleCropControl
              params={params}
              onUpdateParams={onUpdateParams}
              onVisualCropToggle={onVisualCropToggle}
              isVisualCropEnabled={isVisualCropEnabled}
            />
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
