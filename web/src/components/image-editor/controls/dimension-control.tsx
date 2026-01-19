import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, RotateCcw, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface DimensionControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
  originalDimensions: {
    width: number
    height: number
  }
}

export function DimensionControl({
  params,
  onUpdateParams,
  originalDimensions,
}: DimensionControlProps) {
  const { t } = useTranslation()

  // Calculate and store aspect ratio at start
  const [aspectRatio] = useState<number>(() => {
    const w = params.width || originalDimensions.width
    const h = params.height || originalDimensions.height
    return w / h
  })

  // Default to locked
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true)

  const handleWidthChange = (value: string) => {
    const width = parseInt(value) || undefined

    if (aspectRatioLocked && width) {
      // Use stored aspect ratio for calculation
      const newHeight = Math.round(width / aspectRatio)
      onUpdateParams({ width, height: newHeight })
    } else {
      onUpdateParams({ width })
    }
  }

  const handleHeightChange = (value: string) => {
    const height = parseInt(value) || undefined

    if (aspectRatioLocked && height) {
      // Use stored aspect ratio for calculation
      const newWidth = Math.round(height * aspectRatio)
      onUpdateParams({ width: newWidth, height })
    } else {
      onUpdateParams({ height })
    }
  }

  const handleWidthBlur = (value: string) => {
    // Validate only when user finishes editing
    const width = parseInt(value) || 0
    if (width <= 0) {
      // Reset to undefined (auto) if invalid
      onUpdateParams({ width: undefined })
    }
  }

  const handleHeightBlur = (value: string) => {
    // Validate only when user finishes editing
    const height = parseInt(value) || 0
    if (height <= 0) {
      // Reset to undefined (auto) if invalid
      onUpdateParams({ height: undefined })
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
      width: originalDimensions.width,
      height: originalDimensions.height,
    })
  }

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
              value={params.width || ''}
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={(e) => handleWidthBlur(e.target.value)}
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
              value={params.height || ''}
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={(e) => handleHeightBlur(e.target.value)}
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
        <div className='space-y-3'>
          <Label className='text-sm font-medium'>{t('imageEditor.dimensions.alignment')}</Label>
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

      {/* How it works section - at the bottom of resize block */}
      <div className='bg-muted/50 space-y-3 rounded-lg p-3'>
        <div className='space-y-1 text-xs'>
          <ul className='text-muted-foreground space-y-0.5'>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.fitIn')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.fitIn')}
            </li>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.fill')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.fill')}
            </li>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.stretch')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.stretch')}
            </li>
            <li>
              • <strong>{t('imageEditor.dimensions.modes.smart')}:</strong>{' '}
              {t('imageEditor.dimensions.modeDescriptions.smart')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
