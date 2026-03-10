import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, LoaderCircle, MoveHorizontal, Type } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditor, TextAlign, TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'
import { deriveTextAlignFromX } from '@/lib/text-layer-utils'
import { cn } from '@/lib/utils'

import { ColorPickerInput } from './color-picker-input'
import { CompositingControls } from './compositing-controls'
import { PositionControls } from './position-controls'

interface TextLayerControlsProps {
  layer: TextLayer
  imageEditor: ImageEditor
  isTextEditing: boolean
  isToggling?: boolean
  visualCropEnabled?: boolean
  onUpdate: (updates: Partial<TextLayer>) => void
  onEditText: () => Promise<void>
}

export function TextLayerControls({
  layer,
  imageEditor,
  isTextEditing,
  isToggling = false,
  visualCropEnabled = false,
  onUpdate,
  onEditText,
}: TextLayerControlsProps) {
  const { t } = useTranslation()

  const handleEditText = async () => {
    await onEditText()
  }

  // ── Base / bounding-box dimensions ──────────────────────────────────────

  const baseDimensions = imageEditor.getOutputDimensions()
  const baseWidth = baseDimensions.width
  const baseHeight = baseDimensions.height

  const textBBox = useMemo(
    () => calculateTextLayerBoundingBox(layer, baseDimensions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layer, baseDimensions.width, baseDimensions.height],
  )
  const currentWidth = textBBox.width
  const currentHeight = textBBox.height

  // ── Position callbacks ─────────────────────────────────────────────────
  // hAlign changes also sync layer.align via the optional second arg.

  const handleXChange = useCallback(
    (newX: string | number, newHAlign?: 'left' | 'center' | 'right') => {
      // When newHAlign is explicitly provided (alignment button click), map it to TextAlign.
      // Otherwise derive it from the x value itself (drag / offset input / arrow keys).
      let align: TextAlign
      if (newHAlign !== undefined) {
        align = newHAlign === 'center' ? 'centre' : newHAlign === 'right' ? 'high' : 'low'
      } else {
        align = deriveTextAlignFromX(newX)
      }
      onUpdate({ x: newX, align })
    },
    [onUpdate],
  )

  const handleYChange = useCallback((newY: string | number) => onUpdate({ y: newY }), [onUpdate])

  // ── Text-layout handlers ────────────────────────────────────────────────

  // Match 'f' or 'f-N' (full width with optional pixel inset)
  const widthFullMatch =
    typeof layer.width === 'string' ? layer.width.match(/^(?:f|full)(?:-(\d+))?$/) : null
  const widthFull = widthFullMatch !== null
  const widthFullOffset = widthFullMatch?.[1] ? parseInt(widthFullMatch[1]) : 0

  const handleWrapWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()
      if (raw === '' || raw === '0') {
        onUpdate({ width: 0 })
      } else if (raw === 'f') {
        onUpdate({ width: 'f' })
      } else if (raw.endsWith('p')) {
        onUpdate({ width: raw })
      } else {
        const n = parseInt(raw)
        if (!isNaN(n) && n >= 0) onUpdate({ width: n })
      }
    },
    [onUpdate],
  )

  const handleWidthModeToggle = useCallback(() => {
    if (widthFull) {
      // fill → px: resolve 'f' / 'f-N' back to absolute pixels (preserves visual size)
      onUpdate({ width: Math.max(1, baseWidth - widthFullOffset) })
    } else {
      // px → fill: compute inset so the visual wrap width stays the same
      const inset = Math.max(0, baseWidth - currentWidth)
      onUpdate({ width: inset === 0 ? 'f' : `f-${inset}` })
    }
  }, [widthFull, widthFullOffset, baseWidth, currentWidth, onUpdate])

  const handleWidthInsetChange = useCallback(
    (enteredWidth: number) => {
      const inset = Math.max(0, baseWidth - (enteredWidth || 1))
      onUpdate({ width: inset === 0 ? 'f' : `f-${inset}` })
    },
    [baseWidth, onUpdate],
  )

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()
      if (raw === '' || raw === '0') {
        onUpdate({ height: 0 })
      } else if (raw.endsWith('p')) {
        onUpdate({ height: raw })
      } else {
        const n = parseInt(raw)
        if (!isNaN(n) && n >= 0) onUpdate({ height: n })
      }
    },
    [onUpdate],
  )

  // ── Derived values ───────────────────────────────────────────────────────

  // In fill mode show the resolved pixel width (baseWidth minus inset), matching image layer
  const wrapWidthDisplay = widthFull
    ? String(Math.max(1, baseWidth - widthFullOffset))
    : String(layer.width || '')
  const heightDisplay = String(layer.height)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      {/* Edit Text button + color swatch (hidden while editing — toolbar has its own) */}
      <div className='flex items-center gap-2'>
        <Button
          variant={isTextEditing && !isToggling ? 'default' : 'outline'}
          size='default'
          onClick={handleEditText}
          disabled={isToggling || visualCropEnabled}
          className='flex-1'
        >
          {isToggling ? (
            <LoaderCircle className='mr-2 h-4 w-4 animate-spin' />
          ) : isTextEditing ? (
            <Check className='mr-2 h-4 w-4' />
          ) : (
            <Type className='mr-2 h-4 w-4' />
          )}
          {isTextEditing ? t('imageEditor.layers.applyTextEdit') : t('imageEditor.layers.editText')}
        </Button>
        {!isTextEditing && (
          <ColorPickerInput
            value={layer.color}
            onChange={(color) => onUpdate({ color })}
            swatchOnly
            swatchSize='md'
            disabled={visualCropEnabled}
          />
        )}
      </div>

      {/* ── Position Controls ── */}
      <PositionControls
        x={layer.x}
        y={layer.y}
        currentWidth={currentWidth}
        currentHeight={currentHeight}
        baseWidth={baseWidth}
        baseHeight={baseHeight}
        enableArrowKeys={!isTextEditing && !visualCropEnabled}
        disabled={visualCropEnabled}
        onXChange={handleXChange}
        onYChange={handleYChange}
      />

      {/* ── W / H — always visible ── */}
      <div className='flex gap-2'>
        <div className='flex-1 space-y-1'>
          <div className='flex items-center justify-between'>
            <Label className='text-muted-foreground text-xs'>W</Label>
            <div className='flex items-center'>
              <button
                type='button'
                onClick={!visualCropEnabled && widthFull ? handleWidthModeToggle : undefined}
                disabled={visualCropEnabled}
                className={cn(
                  'px-1 py-0.5 text-xs transition-colors',
                  visualCropEnabled
                    ? 'text-muted-foreground pointer-events-none cursor-default font-medium opacity-50'
                    : !widthFull
                      ? 'text-foreground cursor-default font-medium'
                      : 'text-muted-foreground hover:text-foreground cursor-pointer',
                )}
              >
                px
              </button>
              <button
                type='button'
                onClick={!visualCropEnabled && !widthFull ? handleWidthModeToggle : undefined}
                disabled={visualCropEnabled}
                className={cn(
                  'px-1 py-0.5 transition-colors',
                  visualCropEnabled
                    ? 'text-muted-foreground pointer-events-none cursor-default opacity-50'
                    : widthFull
                      ? 'text-primary cursor-default'
                      : 'text-muted-foreground hover:text-foreground cursor-pointer',
                )}
                title='Stretch to fill width'
              >
                <MoveHorizontal className='h-3 w-3' />
              </button>
            </div>
          </div>
          <Input
            type={widthFull ? 'number' : 'text'}
            value={wrapWidthDisplay}
            onChange={(e) =>
              widthFull
                ? handleWidthInsetChange(Number(e.target.value) || 1)
                : handleWrapWidthChange(e)
            }
            min={widthFull ? '1' : undefined}
            max={widthFull ? baseWidth : undefined}
            placeholder='auto'
            className='h-8'
            disabled={visualCropEnabled}
          />
        </div>
        <div className='flex-1 space-y-1'>
          <div className='flex items-center justify-between'>
            <Label className='text-muted-foreground text-xs'>H</Label>
            <span
              className={cn(
                'px-1 py-0.5 text-xs font-medium',
                visualCropEnabled ? 'text-muted-foreground opacity-50' : 'text-foreground',
              )}
            >
              px
            </span>
          </div>
          <Input
            type='text'
            value={heightDisplay}
            onChange={handleHeightChange}
            placeholder='auto'
            className='h-8'
            disabled={visualCropEnabled}
          />
        </div>
      </div>

      {/* ── Compositing ── */}
      <CompositingControls
        alpha={layer.alpha}
        blendMode={layer.blendMode}
        onAlphaChange={(a) => onUpdate({ alpha: a })}
        onBlendModeChange={(m) => onUpdate({ blendMode: m })}
        disabled={visualCropEnabled}
      />
    </div>
  )
}
