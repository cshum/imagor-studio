import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, MoveHorizontal, Type } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ImageEditor, TextAlign, TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'
import { cn } from '@/lib/utils'

import { CompositingControls } from './compositing-controls'
import { PositionControls } from './position-controls'

interface TextLayerControlsProps {
  layer: TextLayer
  imageEditor: ImageEditor
  isTextEditing: boolean
  onUpdate: (updates: Partial<TextLayer>) => void
  onEditText: () => void
}

export function TextLayerControls({
  layer,
  imageEditor,
  isTextEditing,
  onUpdate,
  onEditText,
}: TextLayerControlsProps) {
  const { t } = useTranslation()

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
      if (newHAlign !== undefined) {
        const align: TextAlign =
          newHAlign === 'center' ? 'centre' : newHAlign === 'right' ? 'high' : 'low'
        onUpdate({ x: newX, align })
      } else {
        onUpdate({ x: newX })
      }
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
      {/* Edit Text Button - only show when not already editing */}
      {!isTextEditing && (
        <Button variant='outline' size='default' onClick={onEditText} className='w-full'>
          <Type className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.editText')}
        </Button>
      )}

      {/* Apply Text Edit Button - only show when editing */}
      {isTextEditing && (
        <Button variant='outline' size='default' onClick={onEditText} className='w-full'>
          <Check className='mr-2 h-4 w-4' />
          {t('imageEditor.layers.applyTextEdit')}
        </Button>
      )}

      {/* ── Position Controls ── */}
      <PositionControls
        x={layer.x}
        y={layer.y}
        currentWidth={currentWidth}
        currentHeight={currentHeight}
        baseWidth={baseWidth}
        baseHeight={baseHeight}
        enableArrowKeys={!isTextEditing}
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
                onClick={widthFull ? handleWidthModeToggle : undefined}
                className={cn(
                  'px-1 py-0.5 text-xs transition-colors',
                  !widthFull
                    ? 'text-foreground cursor-default font-medium'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer',
                )}
              >
                px
              </button>
              <button
                type='button'
                onClick={!widthFull ? handleWidthModeToggle : undefined}
                className={cn(
                  'px-1 py-0.5 transition-colors',
                  widthFull
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
          />
        </div>
        <div className='flex-1 space-y-1'>
          <div className='flex items-center justify-between'>
            <Label className='text-muted-foreground text-xs'>H</Label>
            <span className='text-foreground px-1 py-0.5 text-xs font-medium'>px</span>
          </div>
          <Input
            type='text'
            value={heightDisplay}
            onChange={handleHeightChange}
            placeholder='auto'
            className='h-8'
          />
        </div>
      </div>

      {/* ── Compositing ── */}
      <CompositingControls
        alpha={layer.alpha}
        blendMode={layer.blendMode}
        onAlphaChange={(a) => onUpdate({ alpha: a })}
        onBlendModeChange={(m) => onUpdate({ blendMode: m })}
      />
    </div>
  )
}
