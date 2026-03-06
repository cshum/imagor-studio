import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { NumericControl } from '@/components/ui/numeric-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BlendMode } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

export const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'darken',
  'lighten',
  'mask',
]

interface CompositingControlsProps {
  /** imagor alpha scale: 0 = fully opaque, 100 = fully transparent. */
  alpha: number
  blendMode: BlendMode
  /**
   * Called with the new imagor-scale alpha value (0 = opaque, 100 = transparent).
   * The component handles the UI ↔ imagor inversion internally.
   */
  onAlphaChange: (imagorAlpha: number) => void
  onBlendModeChange: (mode: BlendMode) => void
  disabled?: boolean
}

export function CompositingControls({
  alpha,
  blendMode,
  onAlphaChange,
  onBlendModeChange,
  disabled = false,
}: CompositingControlsProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Alpha / Transparency */}
      <NumericControl
        label={t('imageEditor.layers.transparency')}
        value={100 - alpha}
        min={0}
        max={100}
        step={1}
        unit='%'
        onChange={(uiValue) => onAlphaChange(100 - uiValue)}
        disabled={disabled}
      />

      {/* Blend Mode */}
      <div className='space-y-2'>
        <Label
          className={cn('text-sm font-medium', disabled && 'text-muted-foreground opacity-50')}
        >
          {t('imageEditor.layers.blendMode')}
        </Label>
        <Select
          value={blendMode}
          onValueChange={(v) => onBlendModeChange(v as BlendMode)}
          disabled={disabled}
        >
          <SelectTrigger className='h-9'>
            <SelectValue>{t(`imageEditor.layers.blendModes.${blendMode}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BLEND_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>{t(`imageEditor.layers.blendModes.${mode}`)}</span>
                  <span className='text-muted-foreground'>-</span>
                  <span className='text-muted-foreground text-sm'>
                    {t(`imageEditor.layers.blendModeDescriptions.${mode}`)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
