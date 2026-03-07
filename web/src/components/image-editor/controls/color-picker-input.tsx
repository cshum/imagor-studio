import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { useDebouncedCommit } from '@/hooks/use-debounced-commit'

interface ColorPickerInputProps {
  /** Current hex color value (without '#' prefix, e.g. 'ff6600') */
  value: string
  /** Called with the new hex value when committed */
  onChange: (hex: string) => void
  /** Whether the control is disabled */
  disabled?: boolean
  /** Size of the color swatch — defaults to 'sm' (h-8 w-8) */
  swatchSize?: 'sm' | 'md'
  /** Show only the color swatch without the hex text input */
  swatchOnly?: boolean
}

/**
 * Combined native color picker swatch + hex text input.
 *
 * - The color swatch uses debounced commits (live preview while dragging,
 *   undo-history push after 300ms idle).
 * - The hex text input uses local state and only commits on blur or Enter,
 *   so intermediate keystrokes don't trigger renders.
 * - Max 6 hex chars (RGB). Alpha is handled separately via the layer alpha slider.
 */
export function ColorPickerInput({
  value,
  onChange,
  disabled = false,
  swatchSize = 'sm',
  swatchOnly = false,
}: ColorPickerInputProps) {
  const { t } = useTranslation()

  // Local state for the hex text input — only commits on blur / Enter
  const [localHex, setLocalHex] = useState(value)

  // Sync when value changes externally (color picker drag, undo/redo, layer switch)
  useEffect(() => {
    setLocalHex(value)
  }, [value])

  // Commit the local hex value
  const commitHex = useCallback(
    (val: string) => {
      const cleaned = val.replace(/[^a-fA-F0-9]/g, '').slice(0, 6)
      if (cleaned) onChange(cleaned)
    },
    [onChange],
  )

  // Debounced color picker commits — reactive live preview while dragging,
  // but only pushes to undo history after the user stops (300ms debounce).
  const debouncedColor = useDebouncedCommit<string>((hex) => {
    setLocalHex(hex)
    onChange(hex)
  })

  // Convert value to a valid #rrggbb for the native color input
  const swatchValue = `#${value.replace(/^(none|transparent)$/i, 'cccccc').padStart(6, '0')}`

  const swatchClass =
    swatchSize === 'md'
      ? 'border-foreground/40 h-9 w-9 shrink-0 cursor-pointer rounded border-2 p-0.5'
      : 'border-foreground/40 h-8 w-8 shrink-0 cursor-pointer rounded border-2 p-0.5'

  return (
    <div className='flex items-center gap-2'>
      <input
        type='color'
        value={swatchValue}
        onChange={(e) => debouncedColor(e.target.value.replace('#', ''))}
        disabled={disabled}
        className={swatchClass}
        title={t('imageEditor.layers.setColor')}
      />
      {!swatchOnly && (
        <Input
          value={localHex}
          onChange={(e) => {
            setLocalHex(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 6))
          }}
          onBlur={() => commitHex(localHex)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex(localHex)
          }}
          disabled={disabled}
          placeholder='hex color'
          className='h-8 flex-1 font-mono text-xs'
          maxLength={6}
        />
      )}
    </div>
  )
}
