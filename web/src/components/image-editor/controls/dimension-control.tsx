import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, RotateCcw, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericControl } from '@/components/ui/numeric-control'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ImageEditorState } from '@/lib/image-editor.ts'
import { calculateCanvasOutputDimensions } from '@/lib/layer-dimensions'

interface DimensionControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
  originalDimensions: {
    width: number
    height: number
  }
  parentDimensions?: {
    width: number
    height: number
  }
  isEditingLayer?: boolean
}

export function DimensionControl({
  params,
  onUpdateParams,
  originalDimensions,
  parentDimensions,
  isEditingLayer = false,
}: DimensionControlProps) {
  const { t } = useTranslation()

  // Derive aspect ratio from the SOURCE dimensions feeding into the resize step:
  // crop region (if active) > original image.
  // Intentionally excludes params.width/height — those are the OUTPUT values
  // the user is currently typing. Including them would make the ratio
  // self-referential and produce 1:1 when only one axis is set.
  const aspectRatio = useMemo(() => {
    const w = params.cropWidth ?? originalDimensions.width
    const h = params.cropHeight ?? originalDimensions.height
    return w / h
  }, [params.cropWidth, params.cropHeight, originalDimensions.width, originalDimensions.height])

  // Default to locked
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true)

  // Local string state allows free typing without triggering linked-field
  // updates on every keystroke. Linked values are computed only on commit
  // (blur or Enter), matching standard design-tool behaviour (Figma, etc.).
  const [localWidth, setLocalWidth] = useState(params.width?.toString() ?? '')
  const [localHeight, setLocalHeight] = useState(params.height?.toString() ?? '')
  const focusedField = useRef<'width' | 'height' | null>(null)

  // Sync local state from params only when the field is not focused so that
  // external changes (undo, crop, reset) propagate without stomping typing.
  useEffect(() => {
    if (focusedField.current !== 'width') {
      setLocalWidth(params.width?.toString() ?? '')
    }
  }, [params.width])

  useEffect(() => {
    if (focusedField.current !== 'height') {
      setLocalHeight(params.height?.toString() ?? '')
    }
  }, [params.height])

  const commitWidth = (raw: string) => {
    const width = parseInt(raw) || 0
    if (width <= 0) {
      if (aspectRatioLocked) {
        setLocalHeight('')
        onUpdateParams({ width: undefined, height: undefined })
      } else {
        onUpdateParams({ width: undefined })
      }
    } else if (aspectRatioLocked) {
      const newHeight = Math.round(width / aspectRatio)
      setLocalHeight(newHeight.toString())
      onUpdateParams({ width, height: newHeight })
    } else {
      onUpdateParams({ width })
    }
  }

  const commitHeight = (raw: string) => {
    const height = parseInt(raw) || 0
    if (height <= 0) {
      if (aspectRatioLocked) {
        setLocalWidth('')
        onUpdateParams({ width: undefined, height: undefined })
      } else {
        onUpdateParams({ height: undefined })
      }
    } else if (aspectRatioLocked) {
      const newWidth = Math.round(height * aspectRatio)
      setLocalWidth(newWidth.toString())
      onUpdateParams({ width: newWidth, height })
    } else {
      onUpdateParams({ height })
    }
  }

  const handleFitModeChange = (value: string) => {
    // Reset fitting options first and set the new one
    const updates: Partial<ImageEditorState> = {
      fitIn: false,
      stretch: false,
      smart: false,
    }

    switch (value) {
      case 'fit-in':
        updates.fitIn = true
        break
      case 'stretch':
        updates.stretch = true
        break
      case 'smart':
        updates.smart = true
        break
      case 'fill':
        // Default behavior - no special flags
        break
      case 'exact':
        // Exact dimensions - no fitting
        break
    }

    onUpdateParams(updates)
  }

  const getCurrentFitMode = () => {
    if (params.fitIn) return 'fit-in'
    if (params.stretch) return 'stretch'
    if (params.smart) return 'smart'
    return 'fill' // Default
  }

  const handleAlignmentChange = (type: 'horizontal' | 'vertical', value: string) => {
    if (type === 'horizontal') {
      onUpdateParams({ hAlign: value === 'center' ? undefined : value })
    } else {
      onUpdateParams({ vAlign: value === 'middle' ? undefined : value })
    }
  }

  const handleResetSize = () => {
    onUpdateParams({
      width: undefined,
      height: undefined,
    })
  }

  const outputDimensions = calculateCanvasOutputDimensions(
    params,
    originalDimensions,
    parentDimensions,
  )

  return (
    <div className='space-y-4'>
      {/* Dimensions */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>{t('imageEditor.dimensions.title')}</Label>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleResetSize}
            className='text-muted-foreground hover:text-foreground h-6 px-2'
          >
            <RotateCcw className='mr-1 h-3 w-3' />
            <span className='text-xs'>{t('imageEditor.dimensions.reset')}</span>
          </Button>
        </div>
        <div className='grid grid-cols-[1fr_auto_1fr] items-end gap-2'>
          <div>
            <Label htmlFor='width' className='text-muted-foreground text-xs'>
              {t('imageEditor.dimensions.width')}
            </Label>
            <Input
              id='width'
              type='number'
              value={localWidth}
              onChange={(e) => setLocalWidth(e.target.value)}
              onFocus={() => {
                focusedField.current = 'width'
              }}
              onBlur={(e) => {
                focusedField.current = null
                commitWidth(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              placeholder={t('imageEditor.dimensions.auto')}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>

          {/* Lock Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
            className='h-8 w-8 p-0'
            title={
              aspectRatioLocked
                ? t('imageEditor.dimensions.unlockAspectRatio')
                : t('imageEditor.dimensions.lockAspectRatio')
            }
          >
            {aspectRatioLocked ? <Lock className='h-4 w-4' /> : <Unlock className='h-4 w-4' />}
          </Button>

          <div>
            <Label htmlFor='height' className='text-muted-foreground text-xs'>
              {t('imageEditor.dimensions.height')}
            </Label>
            <Input
              id='height'
              type='number'
              value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)}
              onFocus={() => {
                focusedField.current = 'height'
              }}
              onBlur={(e) => {
                focusedField.current = null
                commitHeight(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              placeholder={t('imageEditor.dimensions.auto')}
              min='1'
              max='10000'
              className='h-8'
            />
          </div>
        </div>
      </div>

      {/* Resize Mode */}
      <div className='space-y-3'>
        <Label className='text-sm font-medium'>{t('imageEditor.dimensions.resizeMode')}</Label>
        <RadioGroup
          value={getCurrentFitMode()}
          onValueChange={handleFitModeChange}
          className='grid grid-cols-2 gap-2'
        >
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='fit-in' id='fit-in' />
            <Label htmlFor='fit-in' className='text-sm'>
              {t('imageEditor.dimensions.modes.fitIn')}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='fill' id='fill' />
            <Label htmlFor='fill' className='text-sm'>
              {t('imageEditor.dimensions.modes.fill')}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='stretch' id='stretch' />
            <Label htmlFor='stretch' className='text-sm'>
              {t('imageEditor.dimensions.modes.stretch')}
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='smart' id='smart' />
            <Label htmlFor='smart' className='text-sm'>
              {t('imageEditor.dimensions.modes.smart')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Alignment - Only show when Fill mode is selected */}
      {getCurrentFitMode() === 'fill' && (
        <div className='space-y-2'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label htmlFor='h-align' className='text-muted-foreground text-xs'>
                {t('imageEditor.dimensions.horizontal')}
              </Label>
              <Select
                value={params.hAlign || 'center'}
                onValueChange={(value) => handleAlignmentChange('horizontal', value)}
              >
                <SelectTrigger id='h-align' className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='left'>
                    {t('imageEditor.dimensions.alignments.left')}
                  </SelectItem>
                  <SelectItem value='center'>
                    {t('imageEditor.dimensions.alignments.center')}
                  </SelectItem>
                  <SelectItem value='right'>
                    {t('imageEditor.dimensions.alignments.right')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='v-align' className='text-muted-foreground text-xs'>
                {t('imageEditor.dimensions.vertical')}
              </Label>
              <Select
                value={params.vAlign || 'middle'}
                onValueChange={(value) => handleAlignmentChange('vertical', value)}
              >
                <SelectTrigger id='v-align' className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='top'>{t('imageEditor.dimensions.alignments.top')}</SelectItem>
                  <SelectItem value='middle'>
                    {t('imageEditor.dimensions.alignments.middle')}
                  </SelectItem>
                  <SelectItem value='bottom'>
                    {t('imageEditor.dimensions.alignments.bottom')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Active mode description */}
      <div className='bg-muted/50 rounded-lg px-3 py-2 text-xs'>
        <p className='text-muted-foreground'>
          <strong>
            {getCurrentFitMode() === 'fit-in'
              ? t('imageEditor.dimensions.modes.fitIn')
              : getCurrentFitMode() === 'fill'
                ? t('imageEditor.dimensions.modes.fill')
                : getCurrentFitMode() === 'stretch'
                  ? t('imageEditor.dimensions.modes.stretch')
                  : t('imageEditor.dimensions.modes.smart')}
            :{' '}
          </strong>
          {getCurrentFitMode() === 'fit-in'
            ? t('imageEditor.dimensions.modeDescriptions.fitIn')
            : getCurrentFitMode() === 'fill'
              ? t('imageEditor.dimensions.modeDescriptions.fill')
              : getCurrentFitMode() === 'stretch'
                ? t('imageEditor.dimensions.modeDescriptions.stretch')
                : t('imageEditor.dimensions.modeDescriptions.smart')}
        </p>
      </div>

      {/* Scale – hidden when editing a layer (proportion is a global-only setting) */}
      {!isEditingLayer && (
        <NumericControl
          label={t('imageEditor.dimensions.scale')}
          value={params.proportion ?? 100}
          min={1}
          max={100}
          step={1}
          unit='%'
          onChange={(value) => onUpdateParams({ proportion: value === 100 ? undefined : value })}
        />
      )}

      {/* Output dimensions summary */}
      <div className='flex items-center justify-between text-xs'>
        <span className='text-muted-foreground'>{t('imageEditor.dimensions.outputSize')}</span>
        <span className='font-medium tabular-nums'>
          {outputDimensions.width} × {outputDimensions.height} px
        </span>
      </div>
    </div>
  )
}
