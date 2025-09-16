import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, FileImage, Move, Palette, RotateCw, Scissors } from 'lucide-react'

import { setUserRegistry } from '@/api/registry-api'
import { ColorControls } from '@/components/image-editor/controls/color-controls'
import { DimensionControls } from '@/components/image-editor/controls/dimension-controls'
import { OutputControls } from '@/components/image-editor/controls/output-controls'
import { SimpleCropControls } from '@/components/image-editor/controls/simple-crop-controls'
import { TransformControls } from '@/components/image-editor/controls/transform-controls'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { ImageTransformState } from '@/hooks/use-image-transform'
import { debounce } from '@/lib/utils'
import type { EditorOpenSections } from '@/loaders/image-editor-loader'

interface TransformControlsContentProps {
  params: ImageTransformState
  aspectLocked: boolean
  originalAspectRatio: number | null
  initialOpenSections: EditorOpenSections
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
  initialOpenSections,
  onUpdateParams,
  onToggleAspectLock,
}: TransformControlsContentProps) {
  const { t } = useTranslation()
  const [openSections, setOpenSections] = useState<EditorOpenSections>(initialOpenSections)

  const debouncedSaveOpenSections = useMemo(
    () =>
      debounce(async (sections: EditorOpenSections) => {
        await setUserRegistry('config.editor_open_sections', JSON.stringify(sections))
      }, 300),
    [],
  )

  const handleSectionToggle = useCallback(
    (section: keyof EditorOpenSections, open: boolean) => {
      const newSections = { ...openSections, [section]: open }
      setOpenSections(newSections)
      debouncedSaveOpenSections(newSections)
    },
    [openSections, debouncedSaveOpenSections],
  )

  const CollapsibleIcon = ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />

  return (
    <div className='space-y-4'>
      {/* Dimensions & Resize */}
      <Card className='p-4'>
        <Collapsible
          open={openSections.dimensions}
          onOpenChange={(open) => handleSectionToggle('dimensions', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <Move className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.dimensionsResize')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.dimensions} />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
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
      <Card className='p-4'>
        <Collapsible
          open={openSections.output}
          onOpenChange={(open) => handleSectionToggle('output', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <FileImage className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.outputCompression')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.output} />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
            <OutputControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Color & Effects */}
      <Card className='p-4'>
        <Collapsible
          open={openSections.effects}
          onOpenChange={(open) => handleSectionToggle('effects', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <Palette className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.colorEffects')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.effects} />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
            <ColorControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Transform & Rotate */}
      <Card className='p-4'>
        <Collapsible
          open={openSections.transform}
          onOpenChange={(open) => handleSectionToggle('transform', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <RotateCw className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.transformRotate')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.transform} />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
            <TransformControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Crop & Trim */}
      <Card className='p-4'>
        <Collapsible
          open={openSections.crop}
          onOpenChange={(open) => handleSectionToggle('crop', open)}
        >
          <CollapsibleTrigger className='flex w-full items-center justify-between text-left'>
            <div className='flex items-center gap-2'>
              <Scissors className='h-4 w-4' />
              <span className='font-medium'>{t('imageEditor.controls.cropTrim')}</span>
            </div>
            <CollapsibleIcon isOpen={openSections.crop} />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4'>
            <SimpleCropControls params={params} onUpdateParams={onUpdateParams} />
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
