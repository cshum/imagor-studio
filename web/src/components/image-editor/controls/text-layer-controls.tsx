import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Check,
  Type,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericControl } from '@/components/ui/numeric-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { BlendMode, ImageEditor, TextAlign, TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'

interface TextLayerControlsProps {
  layer: TextLayer
  imageEditor: ImageEditor
  isTextEditing: boolean
  onUpdate: (updates: Partial<TextLayer>) => void
  onEditText: () => void
}

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'darken',
  'lighten',
  'mask',
]

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

  // ── X/Y alignment parsing (same semantics as ImageLayer) ─────────────────

  const { hAlign, vAlign, xOffset, yOffset } = useMemo(() => {
    const x = layer.x
    const y = layer.y

    let hAlign: 'left' | 'center' | 'right' = 'center'
    let xOffset = 0
    if (typeof x === 'string') {
      if (x === 'left') hAlign = 'left'
      else if (x === 'right') hAlign = 'right'
      else if (x === 'center') hAlign = 'center'
      else {
        const leftMatch = x.match(/^(?:left|l)-(\d+)$/)
        const rightMatch = x.match(/^(?:right|r)-(\d+)$/)
        if (leftMatch) {
          hAlign = 'left'
          xOffset = -parseInt(leftMatch[1])
        } else if (rightMatch) {
          hAlign = 'right'
          xOffset = -parseInt(rightMatch[1])
        }
      }
    } else {
      if (x < 0) {
        hAlign = 'right'
        xOffset = Math.abs(x)
      } else {
        hAlign = 'left'
        xOffset = x
      }
    }

    let vAlign: 'top' | 'center' | 'bottom' = 'center'
    let yOffset = 0
    if (typeof y === 'string') {
      if (y === 'top') vAlign = 'top'
      else if (y === 'bottom') vAlign = 'bottom'
      else if (y === 'center') vAlign = 'center'
      else {
        const topMatch = y.match(/^(?:top|t)-(\d+)$/)
        const bottomMatch = y.match(/^(?:bottom|b)-(\d+)$/)
        if (topMatch) {
          vAlign = 'top'
          yOffset = -parseInt(topMatch[1])
        } else if (bottomMatch) {
          vAlign = 'bottom'
          yOffset = -parseInt(bottomMatch[1])
        }
      }
    } else {
      if (y < 0) {
        vAlign = 'bottom'
        yOffset = Math.abs(y)
      } else {
        vAlign = 'top'
        yOffset = y
      }
    }

    return { hAlign, vAlign, xOffset, yOffset }
  }, [layer.x, layer.y])

  // ── Position handlers ────────────────────────────────────────────────────

  const handleXOffsetChange = useCallback(
    (value: number) => {
      if (value === 0) {
        onUpdate({ x: hAlign })
      } else if (value < 0) {
        onUpdate({ x: `${hAlign}-${Math.abs(value)}` })
      } else {
        onUpdate({ x: hAlign === 'right' ? -value : value })
      }
    },
    [onUpdate, hAlign],
  )

  const handleYOffsetChange = useCallback(
    (value: number) => {
      if (value === 0) {
        onUpdate({ y: vAlign })
      } else if (value < 0) {
        onUpdate({ y: `${vAlign}-${Math.abs(value)}` })
      } else {
        onUpdate({ y: vAlign === 'bottom' ? -value : value })
      }
    },
    [onUpdate, vAlign],
  )

  const handleHAlignChange = useCallback(
    (value: string) => {
      // Sync layer.align to match the new x-anchor so text flow matches position
      const align: TextAlign = value === 'center' ? 'centre' : value === 'right' ? 'high' : 'low'
      if (value === 'center') {
        onUpdate({ x: 'center', align })
      } else if (value === hAlign) {
        return
      } else {
        let visualX: number
        if (hAlign === 'left') visualX = xOffset
        else if (hAlign === 'right') visualX = baseWidth - currentWidth - xOffset
        else visualX = (baseWidth - currentWidth) / 2

        if (value === 'left') {
          const newOffset = Math.round(visualX)
          if (newOffset < 0) onUpdate({ x: `left-${Math.abs(newOffset)}`, align })
          else if (newOffset === 0) onUpdate({ x: 'left', align })
          else onUpdate({ x: newOffset, align })
        } else {
          const newOffset = Math.round(baseWidth - currentWidth - visualX)
          if (newOffset < 0) onUpdate({ x: `right-${Math.abs(newOffset)}`, align })
          else if (newOffset === 0) onUpdate({ x: 'right', align })
          else onUpdate({ x: -newOffset, align })
        }
      }
    },
    [onUpdate, hAlign, xOffset, baseWidth, currentWidth],
  )

  const handleVAlignChange = useCallback(
    (value: string) => {
      if (value === 'center') {
        onUpdate({ y: 'center' })
      } else if (value === vAlign) {
        return
      } else {
        let visualY: number
        if (vAlign === 'top') visualY = yOffset
        else if (vAlign === 'bottom') visualY = baseHeight - currentHeight - yOffset
        else visualY = (baseHeight - currentHeight) / 2

        if (value === 'top') {
          const newOffset = Math.round(visualY)
          if (newOffset < 0) onUpdate({ y: `top-${Math.abs(newOffset)}` })
          else if (newOffset === 0) onUpdate({ y: 'top' })
          else onUpdate({ y: newOffset })
        } else {
          const newOffset = Math.round(baseHeight - currentHeight - visualY)
          if (newOffset < 0) onUpdate({ y: `bottom-${Math.abs(newOffset)}` })
          else if (newOffset === 0) onUpdate({ y: 'bottom' })
          else onUpdate({ y: -newOffset })
        }
      }
    },
    [onUpdate, vAlign, yOffset, baseHeight, currentHeight],
  )

  // ── Text-layout handlers ────────────────────────────────────────────────

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

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()
      if (raw === '' || raw === '0') {
        onUpdate({ height: 0 })
      } else if (raw === 'f') {
        onUpdate({ height: 'f' })
      } else if (raw.endsWith('p')) {
        onUpdate({ height: raw })
      } else {
        const n = parseInt(raw)
        if (!isNaN(n) && n >= 0) onUpdate({ height: n })
      }
    },
    [onUpdate],
  )

  // ── Compositing handlers ─────────────────────────────────────────────────

  const handleAlphaChange = useCallback(
    (value: number) => {
      // UI shows 0=transparent…100=opaque; imagor uses 0=opaque…100=transparent
      onUpdate({ alpha: 100 - value })
    },
    [onUpdate],
  )

  const handleBlendModeChange = useCallback(
    (value: string) => {
      onUpdate({ blendMode: value as BlendMode })
    },
    [onUpdate],
  )

  // ── Arrow key positioning (only when not text-editing) ───────────────────

  useEffect(() => {
    if (isTextEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      e.preventDefault()

      if (e.key === 'ArrowLeft' && hAlign !== 'center') handleXOffsetChange(xOffset - 1)
      else if (e.key === 'ArrowRight' && hAlign !== 'center') handleXOffsetChange(xOffset + 1)
      if (e.key === 'ArrowUp' && vAlign !== 'center') handleYOffsetChange(yOffset - 1)
      else if (e.key === 'ArrowDown' && vAlign !== 'center') handleYOffsetChange(yOffset + 1)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isTextEditing, hAlign, vAlign, xOffset, yOffset, handleXOffsetChange, handleYOffsetChange])

  // ── Derived values ───────────────────────────────────────────────────────

  const wrapWidthDisplay = String(layer.width)
  const heightDisplay = String(layer.height)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      {/* Edit Text / Done Button */}
      <Button
        variant={isTextEditing ? 'default' : 'outline'}
        size='default'
        onClick={onEditText}
        className='w-full'
      >
        {isTextEditing ? (
          <>
            <Check className='mr-2 h-4 w-4' />
            Done
          </>
        ) : (
          <>
            <Type className='mr-2 h-4 w-4' />
            {t('imageEditor.layers.editText')}
          </>
        )}
      </Button>

      {/* ── Position Controls — always visible ── */}
      <div className='space-y-1.5'>
        {/* Horizontal alignment + X offset */}
        <div className='flex items-center gap-2'>
          <ToggleGroup
            type='single'
            value={hAlign}
            onValueChange={handleHAlignChange}
            variant='outline'
            size='sm'
            className='flex-1 gap-0'
          >
            <ToggleGroupItem
              value='left'
              aria-label='Align left'
              className='w-full rounded-r-none border-r-0'
            >
              <AlignHorizontalJustifyStart className='h-4 w-4' />
            </ToggleGroupItem>
            <ToggleGroupItem
              value='center'
              aria-label='Align center'
              className='w-full rounded-none border-r-0'
            >
              <AlignHorizontalJustifyCenter className='h-4 w-4' />
            </ToggleGroupItem>
            <ToggleGroupItem
              value='right'
              aria-label='Align right'
              className='w-full rounded-l-none'
            >
              <AlignHorizontalJustifyEnd className='h-4 w-4' />
            </ToggleGroupItem>
          </ToggleGroup>
          <span className='text-muted-foreground w-3 shrink-0 text-center text-xs font-medium'>
            X
          </span>
          <Input
            type='number'
            value={hAlign === 'center' ? '' : xOffset}
            onChange={(e) => handleXOffsetChange(Number(e.target.value) || 0)}
            disabled={hAlign === 'center'}
            placeholder='—'
            step={1}
            className='h-9 w-20 px-2'
          />
        </div>

        {/* Vertical alignment + Y offset */}
        <div className='flex items-center gap-2'>
          <ToggleGroup
            type='single'
            value={vAlign}
            onValueChange={handleVAlignChange}
            variant='outline'
            size='sm'
            className='flex-1 gap-0'
          >
            <ToggleGroupItem
              value='top'
              aria-label='Align top'
              className='w-full rounded-r-none border-r-0'
            >
              <AlignVerticalJustifyStart className='h-4 w-4' />
            </ToggleGroupItem>
            <ToggleGroupItem
              value='center'
              aria-label='Align middle'
              className='w-full rounded-none border-r-0'
            >
              <AlignVerticalJustifyCenter className='h-4 w-4' />
            </ToggleGroupItem>
            <ToggleGroupItem
              value='bottom'
              aria-label='Align bottom'
              className='w-full rounded-l-none'
            >
              <AlignVerticalJustifyEnd className='h-4 w-4' />
            </ToggleGroupItem>
          </ToggleGroup>
          <span className='text-muted-foreground w-3 shrink-0 text-center text-xs font-medium'>
            Y
          </span>
          <Input
            type='number'
            value={vAlign === 'center' ? '' : yOffset}
            onChange={(e) => handleYOffsetChange(Number(e.target.value) || 0)}
            disabled={vAlign === 'center'}
            placeholder='—'
            step={1}
            className='h-9 w-20 px-2'
          />
        </div>
      </div>

      {/* ── W / H — always visible ── */}
      <div className='flex gap-2'>
        <div className='flex-1 space-y-1.5'>
          <Label className='text-muted-foreground text-xs'>W</Label>
          <Input
            type='text'
            value={wrapWidthDisplay}
            onChange={handleWrapWidthChange}
            placeholder='0 / px / 80p / f'
            className='h-8'
          />
        </div>
        <div className='flex-1 space-y-1.5'>
          <Label className='text-muted-foreground text-xs'>H</Label>
          <Input
            type='text'
            value={heightDisplay}
            onChange={handleHeightChange}
            placeholder='0 / px / 80p / f'
            className='h-8'
          />
        </div>
      </div>

      {/* ── Opacity — always visible ── */}
      <NumericControl
        label={t('imageEditor.layers.transparency')}
        value={100 - layer.alpha}
        min={0}
        max={100}
        step={1}
        unit='%'
        onChange={handleAlphaChange}
      />

      {/* ── Blend Mode — always visible ── */}
      <div className='space-y-1.5'>
        <Label className='text-sm font-medium'>{t('imageEditor.layers.blendMode')}</Label>
        <Select value={layer.blendMode} onValueChange={handleBlendModeChange}>
          <SelectTrigger className='h-8'>
            <SelectValue>{t(`imageEditor.layers.blendModes.${layer.blendMode}`)}</SelectValue>
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
    </div>
  )
}
