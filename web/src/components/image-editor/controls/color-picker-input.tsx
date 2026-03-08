import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { NumericControl } from '@/components/ui/numeric-control'
import { useDebouncedCommit } from '@/hooks/use-debounced-commit'
import { buildColorValue, parseColorValue } from '@/lib/image-editor'

interface ColorPickerInputProps {
  /** Current color value (without '#' prefix). Supports:
   *  - 6-char hex: 'ff6600' (opaque)
   *  - 8-char hex: 'ff660080' (with alpha)
   *  - 'none' / 'transparent' (fully transparent)
   */
  value: string
  /** Called with the new color value when committed */
  onChange: (color: string) => void
  /** Whether the control is disabled */
  disabled?: boolean
  /** Size of the color swatch — defaults to 'sm' (h-8 w-8) */
  swatchSize?: 'sm' | 'md'
  /** Show only the color swatch without the hex text input */
  swatchOnly?: boolean
  /** Show an opacity slider below the color picker (0–100%).
   *  When opacity is 0, emits 'none'. When < 100, emits 8-char hex with alpha. */
  showOpacity?: boolean
}

/**
 * Combined native color picker swatch + hex text input + optional opacity slider.
 *
 * - The color swatch uses debounced commits (live preview while dragging,
 *   undo-history push after 300ms idle).
 * - The hex text input uses local state and only commits on blur or Enter,
 *   so intermediate keystrokes don't trigger renders.
 * - Max 6 hex chars (RGB). Alpha is controlled via the opacity slider when enabled.
 * - When showOpacity is enabled, the swatch shows a checkerboard behind the color
 *   to indicate transparency.
 */
export function ColorPickerInput({
  value,
  onChange,
  disabled = false,
  swatchSize = 'sm',
  swatchOnly = false,
  showOpacity = false,
}: ColorPickerInputProps) {
  const { t } = useTranslation()

  // Parse the incoming value into hex + opacity
  const parsed = parseColorValue(value)

  // Local state for the hex text input — only commits on blur / Enter
  const [localHex, setLocalHex] = useState(parsed.hex)

  // Local state for the opacity slider — only used when showOpacity is enabled
  const [localOpacity, setLocalOpacity] = useState(parsed.opacity)

  // Sync when value changes externally (color picker drag, undo/redo, layer switch)
  useEffect(() => {
    const p = parseColorValue(value)
    setLocalHex(p.hex)
    setLocalOpacity(p.opacity)
  }, [value])

  // Commit the local hex value (from text input blur/Enter)
  const commitHex = useCallback(
    (val: string) => {
      const cleaned = val.replace(/[^a-fA-F0-9]/g, '').slice(0, 6)
      if (cleaned) {
        if (showOpacity) {
          onChange(buildColorValue(cleaned, localOpacity))
        } else {
          onChange(cleaned)
        }
      }
    },
    [onChange, showOpacity, localOpacity],
  )

  // Debounced color picker commits — reactive live preview while dragging,
  // but only pushes to undo history after the user stops (300ms debounce).
  const debouncedColor = useDebouncedCommit<string>((hex) => {
    setLocalHex(hex)
    if (showOpacity) {
      // When opacity is 0 and user picks a color, auto-set opacity to 100
      const effectiveOpacity = localOpacity === 0 ? 100 : localOpacity
      if (localOpacity === 0) setLocalOpacity(100)
      onChange(buildColorValue(hex, effectiveOpacity))
    } else {
      onChange(hex)
    }
  })

  // Debounced opacity commit — only debounce the onChange call to parent.
  // localOpacity is updated immediately so the slider thumb tracks the drag.
  const debouncedOpacityCommit = useDebouncedCommit<number>((opacity) => {
    onChange(buildColorValue(localHex, opacity))
  })

  const handleOpacityChange = useCallback(
    (v: number) => {
      setLocalOpacity(v) // Immediate — slider thumb follows the drag
      debouncedOpacityCommit(v) // Debounced — commit after user stops
    },
    [debouncedOpacityCommit],
  )

  // Convert value to a valid #rrggbb for the native color input
  const swatchHex = `#${parsed.hex.padStart(6, '0')}`

  const isTransparent = showOpacity && localOpacity < 100

  const swatchDimClass = swatchSize === 'md' ? 'h-9 w-9' : 'h-8 w-8'

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        {/* Color swatch with optional checkerboard for transparency */}
        <div
          className={`${swatchDimClass} border-foreground/40 shrink-0 overflow-hidden rounded border-2 ${isTransparent ? 'checkerboard-bg' : ''}`}
          style={
            isTransparent
              ? { backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }
              : undefined
          }
        >
          <input
            type='color'
            value={swatchHex}
            onChange={(e) => debouncedColor(e.target.value.replace('#', ''))}
            disabled={disabled}
            className='h-full w-full cursor-pointer border-0'
            style={isTransparent ? { opacity: localOpacity / 100 } : undefined}
            title={t('imageEditor.layers.setColor')}
          />
        </div>
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

      {/* Opacity control — only shown when showOpacity is enabled */}
      {showOpacity && (
        <NumericControl
          label={t('imageEditor.layers.transparency')}
          value={localOpacity}
          onChange={handleOpacityChange}
          min={0}
          max={100}
          step={1}
          unit='%'
          disabled={disabled}
        />
      )}
    </div>
  )
}
