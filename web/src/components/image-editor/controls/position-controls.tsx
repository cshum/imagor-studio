import { useCallback, useEffect, useMemo } from 'react'
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface PositionControlsProps {
  x: string | number
  y: string | number
  /** Rendered pixel width of the layer (used for visual-position-preserving alignment swaps). */
  currentWidth: number
  /** Rendered pixel height of the layer. */
  currentHeight: number
  /** Canvas pixel width (parent output width). */
  baseWidth: number
  /** Canvas pixel height (parent output height). */
  baseHeight: number
  /** Disables all controls (e.g. when visual-crop mode is active for image layers). */
  disabled?: boolean
  /**
   * When true, the arrow-key nudge listener is active.
   * Pass `!isEditing && !visualCropEnabled` for image layers, `!isTextEditing` for text layers.
   */
  enableArrowKeys?: boolean
  /**
   * Called whenever x changes.
   * When the change comes from an alignment button click (not an offset edit), `newHAlign` is
   * also provided so the caller can make one atomic update (e.g. text layer syncs layer.align).
   */
  onXChange: (newX: string | number, newHAlign?: 'left' | 'center' | 'right') => void
  onYChange: (newY: string | number) => void
}

export function PositionControls({
  x,
  y,
  currentWidth,
  currentHeight,
  baseWidth,
  baseHeight,
  disabled = false,
  enableArrowKeys = false,
  onXChange,
  onYChange,
}: PositionControlsProps) {
  // ── Parse x / y into alignment + offset ──────────────────────────────────

  const { hAlign, vAlign, xOffset, yOffset } = useMemo(() => {
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
  }, [x, y])

  // ── Offset-input handlers ─────────────────────────────────────────────────

  const handleXOffsetChange = useCallback(
    (value: number) => {
      if (value === 0) onXChange(hAlign)
      else if (value < 0) onXChange(`${hAlign}-${Math.abs(value)}`)
      else onXChange(hAlign === 'right' ? -value : value)
    },
    [onXChange, hAlign],
  )

  const handleYOffsetChange = useCallback(
    (value: number) => {
      if (value === 0) onYChange(vAlign)
      else if (value < 0) onYChange(`${vAlign}-${Math.abs(value)}`)
      else onYChange(vAlign === 'bottom' ? -value : value)
    },
    [onYChange, vAlign],
  )

  // ── Alignment-button handlers ─────────────────────────────────────────────
  // Both compute the new x/y that preserves the current visual position, then
  // call the parent callback. hAlign changes also pass the new alignment string
  // as a second argument so callers can do one atomic update (e.g. text layer
  // syncing layer.align without triggering two separate state updates).

  const handleHAlignButtonChange = useCallback(
    (value: string) => {
      if (!value) return
      const target = value as 'left' | 'center' | 'right'

      let newX: string | number
      if (target === 'center') {
        newX = 'center'
      } else if (target === hAlign) {
        return
      } else {
        // Preserve visual position when switching anchor side
        let visualX: number
        if (hAlign === 'left') visualX = xOffset
        else if (hAlign === 'right') visualX = baseWidth - currentWidth - xOffset
        else visualX = (baseWidth - currentWidth) / 2

        if (target === 'left') {
          const newOffset = Math.round(visualX)
          if (newOffset < 0) newX = `left-${Math.abs(newOffset)}`
          else if (newOffset === 0) newX = 'left'
          else newX = newOffset
        } else {
          const newOffset = Math.round(baseWidth - currentWidth - visualX)
          if (newOffset < 0) newX = `right-${Math.abs(newOffset)}`
          else if (newOffset === 0) newX = 'right'
          else newX = -newOffset
        }
      }

      onXChange(newX, target)
    },
    [hAlign, xOffset, baseWidth, currentWidth, onXChange],
  )

  const handleVAlignButtonChange = useCallback(
    (value: string) => {
      if (!value) return
      const target = value as 'top' | 'center' | 'bottom'

      let newY: string | number
      if (target === 'center') {
        newY = 'center'
      } else if (target === vAlign) {
        return
      } else {
        let visualY: number
        if (vAlign === 'top') visualY = yOffset
        else if (vAlign === 'bottom') visualY = baseHeight - currentHeight - yOffset
        else visualY = (baseHeight - currentHeight) / 2

        if (target === 'top') {
          const newOffset = Math.round(visualY)
          if (newOffset < 0) newY = `top-${Math.abs(newOffset)}`
          else if (newOffset === 0) newY = 'top'
          else newY = newOffset
        } else {
          const newOffset = Math.round(baseHeight - currentHeight - visualY)
          if (newOffset < 0) newY = `bottom-${Math.abs(newOffset)}`
          else if (newOffset === 0) newY = 'bottom'
          else newY = -newOffset
        }
      }

      onYChange(newY)
    },
    [vAlign, yOffset, baseHeight, currentHeight, onYChange],
  )

  // ── Arrow-key nudge ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!enableArrowKeys) return

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
  }, [enableArrowKeys, hAlign, vAlign, xOffset, yOffset, handleXOffsetChange, handleYOffsetChange])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className='space-y-1.5'>
      {/* Horizontal alignment + X offset */}
      <div className='flex items-center gap-2'>
        <ToggleGroup
          type='single'
          value={hAlign}
          onValueChange={handleHAlignButtonChange}
          variant='outline'
          size='sm'
          className='flex-1 gap-0'
          disabled={disabled}
        >
          <ToggleGroupItem
            value='left'
            aria-label='Align left'
            className='w-full rounded-r-none border-r-0'
            disabled={disabled}
          >
            <AlignHorizontalJustifyStart className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='center'
            aria-label='Align center'
            className='w-full rounded-none border-r-0'
            disabled={disabled}
          >
            <AlignHorizontalJustifyCenter className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='right'
            aria-label='Align right'
            className='w-full rounded-l-none'
            disabled={disabled}
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
          disabled={hAlign === 'center' || disabled}
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
          onValueChange={handleVAlignButtonChange}
          variant='outline'
          size='sm'
          className='flex-1 gap-0'
          disabled={disabled}
        >
          <ToggleGroupItem
            value='top'
            aria-label='Align top'
            className='w-full rounded-r-none border-r-0'
            disabled={disabled}
          >
            <AlignVerticalJustifyStart className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='center'
            aria-label='Align middle'
            className='w-full rounded-none border-r-0'
            disabled={disabled}
          >
            <AlignVerticalJustifyCenter className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='bottom'
            aria-label='Align bottom'
            className='w-full rounded-l-none'
            disabled={disabled}
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
          disabled={vAlign === 'center' || disabled}
          placeholder='—'
          step={1}
          className='h-9 w-20 px-2'
        />
      </div>
    </div>
  )
}
