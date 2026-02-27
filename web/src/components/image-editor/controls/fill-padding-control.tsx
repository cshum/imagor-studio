import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ImageEditorState } from '@/lib/image-editor.ts'

interface FillPaddingControlProps {
  params: ImageEditorState
  onUpdateParams: (updates: Partial<ImageEditorState>) => void
}

export function FillPaddingControl({ params, onUpdateParams }: FillPaddingControlProps) {
  const { t } = useTranslation()

  // Calculate fill mode from params (no useState - follows convention)
  const getFillMode = (): 'none' | 'transparent' | 'color' => {
    if (!params.fillColor) return 'none'
    if (params.fillColor === 'none') return 'transparent'
    return 'color'
  }

  // Calculate values directly from params on every render
  const fillMode = getFillMode()
  const customColor =
    params.fillColor && params.fillColor !== 'none' ? `#${params.fillColor}` : '#FFFFFF'

  const handleFillModeChange = (mode: 'none' | 'transparent' | 'color') => {
    if (mode === 'none') {
      onUpdateParams({ fillColor: undefined })
    } else if (mode === 'transparent') {
      onUpdateParams({ fillColor: 'none' })
    } else {
      // Color mode - use current custom color (or default white)
      const hexWithoutHash = customColor.replace('#', '')
      onUpdateParams({ fillColor: hexWithoutHash })
    }
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    const hexWithoutHash = newColor.replace('#', '')
    onUpdateParams({ fillColor: hexWithoutHash })
  }

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const numValue = parseInt(value) || 0
    const updates: Partial<ImageEditorState> = {}

    switch (side) {
      case 'top':
        updates.paddingTop = numValue
        break
      case 'right':
        updates.paddingRight = numValue
        break
      case 'bottom':
        updates.paddingBottom = numValue
        break
      case 'left':
        updates.paddingLeft = numValue
        break
    }

    onUpdateParams(updates)
  }

  // Determine if padding should be enabled
  const isPaddingEnabled = fillMode === 'transparent' || fillMode === 'color'

  return (
    <div className='space-y-3 pb-2'>
      {/* Fill — always-visible color picker; clicking it auto-switches to Color mode */}
      <div className='flex items-center gap-2'>
        <Select value={fillMode} onValueChange={handleFillModeChange}>
          <SelectTrigger className='h-9 flex-1'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>{t('imageEditor.fillPadding.noFill')}</SelectItem>
            <SelectItem value='color'>{t('imageEditor.fillPadding.customColor')}</SelectItem>
            <SelectItem value='transparent'>{t('imageEditor.fillPadding.transparent')}</SelectItem>
          </SelectContent>
        </Select>
        <input
          type='color'
          value={customColor}
          onChange={handleColorChange}
          onClick={() => {
            if (fillMode !== 'color') handleFillModeChange('color')
          }}
          className='h-9 w-10 cursor-pointer rounded border'
          title={t('imageEditor.fillPadding.customColor')}
        />
      </div>

      {/* Padding — arrow icons, disabled when no fill */}
      <div
        className={`grid grid-cols-2 gap-1.5 ${
          !isPaddingEnabled ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {(
          [
            { side: 'top', Icon: ArrowUp },
            { side: 'right', Icon: ArrowRight },
            { side: 'bottom', Icon: ArrowDown },
            { side: 'left', Icon: ArrowLeft },
          ] as const
        ).map(({ side, Icon }) => (
          <div key={side} className='flex items-center gap-1.5'>
            <Icon className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
            <Input
              id={`padding-${side}`}
              type='number'
              value={
                (params[
                  `padding${side.charAt(0).toUpperCase()}${side.slice(1)}` as keyof ImageEditorState
                ] as number) || 0
              }
              onChange={(e) => handlePaddingChange(side, e.target.value)}
              min='0'
              max='1000'
              className='h-9 flex-1 px-2'
              disabled={!isPaddingEnabled}
            />
          </div>
        ))}
      </div>

      <p className='text-muted-foreground text-xs'>{t('imageEditor.fillPadding.description')}</p>
    </div>
  )
}
