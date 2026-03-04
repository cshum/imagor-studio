import { useTranslation } from 'react-i18next'
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, Italic } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TextAlign, TextLayer } from '@/lib/image-editor'

interface TextEditToolbarProps {
  layer: TextLayer
  /** Left edge of the text layer as a fraction of the canvas width (0–1). */
  leftFrac: number
  /** Right edge of the text layer as a fraction of the canvas width (0–1). */
  rightFrac: number
  /** Top edge of the text layer as a fraction of the canvas height (0–1). */
  topFrac: number
  /** Bottom edge of the text layer as a fraction of the canvas height (0–1). */
  bottomFrac: number
  toolbarRef: React.RefObject<HTMLDivElement | null>
  onUpdate: (updates: Partial<TextLayer>) => void
  onDone: () => void
}

const FONTS = [
  'sans',
  'serif',
  'monospace',
  'Noto Sans',
  'DejaVu Sans',
  'Liberation Sans',
  'Ubuntu',
]

export function TextEditToolbar({
  layer,
  leftFrac,
  rightFrac,
  topFrac,
  bottomFrac,
  toolbarRef,
  onUpdate,
  onDone,
}: TextEditToolbarProps) {
  const { t } = useTranslation()

  // ── Smart placement ──────────────────────────────────────────────────────
  // Vertical: prefer above the layer top edge; fall back to below bottom edge.
  const placeAbove = topFrac >= 0.08

  // Horizontal: prefer left-anchored to the layer's left edge (toolbar grows
  // rightward). If the layer is close to the right canvas edge, right-anchor
  // it to the layer's right edge (toolbar grows leftward). Otherwise centre.
  // TOOLBAR_WIDTH_FRAC is a rough estimate of how wide the toolbar is as a
  // fraction of the canvas — used only to decide which anchor fits.
  const TOOLBAR_WIDTH_FRAC = 0.45
  const spaceToRight = 1 - leftFrac // canvas space starting from layer's left edge
  const spaceToLeft = rightFrac // canvas space ending at layer's right edge

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    // Vertical edge: pin toolbar bottom to layer top (above), or top to layer bottom (below)
    top: placeAbove ? undefined : `${bottomFrac * 100}%`,
    bottom: placeAbove ? `${(1 - topFrac) * 100}%` : undefined,
    marginTop: placeAbove ? undefined : '4px',
    marginBottom: placeAbove ? '4px' : undefined,
    zIndex: 40,
    pointerEvents: 'auto',
    whiteSpace: 'nowrap',
  }

  let toolbarStyle: React.CSSProperties
  if (spaceToRight >= TOOLBAR_WIDTH_FRAC) {
    // Anchor toolbar's left edge to layer's left edge — grows rightward
    toolbarStyle = { ...commonStyle, left: `${leftFrac * 100}%` }
  } else if (spaceToLeft >= TOOLBAR_WIDTH_FRAC) {
    // Anchor toolbar's right edge to layer's right edge — grows leftward
    toolbarStyle = { ...commonStyle, right: `${(1 - rightFrac) * 100}%` }
  } else {
    // Not enough room on either side — centre over the layer
    const centerXFrac = (leftFrac + rightFrac) / 2
    toolbarStyle = {
      ...commonStyle,
      left: `${centerXFrac * 100}%`,
      transform: 'translateX(-50%)',
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasBold = layer.fontStyle.includes('bold')
  const hasItalic = layer.fontStyle.includes('italic')
  const colorHex = `#${layer.color.padStart(6, '0')}`

  // ── Handlers — all use onMouseDown + preventDefault to keep textarea focused ──

  const toggleBold = (e: React.MouseEvent) => {
    e.preventDefault()
    if (hasBold) {
      onUpdate({ fontStyle: hasItalic ? 'italic' : '' })
    } else {
      onUpdate({ fontStyle: hasItalic ? 'bold italic' : 'bold' })
    }
  }

  const toggleItalic = (e: React.MouseEvent) => {
    e.preventDefault()
    if (hasItalic) {
      onUpdate({ fontStyle: hasBold ? 'bold' : '' })
    } else {
      onUpdate({ fontStyle: hasBold ? 'bold italic' : 'italic' })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={toolbarRef}
      style={toolbarStyle}
      className='bg-background/95 border-border flex items-center gap-1 rounded-md border px-1.5 py-1 shadow-lg backdrop-blur-sm'
      // Prevent the overlay's background onMouseDown (which commits) from firing
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Bold */}
      <Button
        variant={hasBold ? 'default' : 'ghost'}
        size='icon'
        className='h-7 w-7'
        onMouseDown={toggleBold}
        tabIndex={-1}
        title='Bold'
      >
        <Bold className='h-3.5 w-3.5' />
      </Button>

      {/* Italic */}
      <Button
        variant={hasItalic ? 'default' : 'ghost'}
        size='icon'
        className='h-7 w-7'
        onMouseDown={toggleItalic}
        tabIndex={-1}
        title='Italic'
      >
        <Italic className='h-3.5 w-3.5' />
      </Button>

      <div className='bg-border mx-0.5 h-5 w-px' />

      {/* Font family */}
      <Select value={layer.font} onValueChange={(v) => onUpdate({ font: v })}>
        <SelectTrigger
          className='h-7 w-28 px-2 text-xs'
          // preventDefault keeps focus on the textarea while still opening the dropdown
          onMouseDown={(e) => e.preventDefault()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((f) => (
            <SelectItem key={f} value={f} className='text-xs'>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font size stepper — buttons only so focus stays on textarea */}
      <div className='flex items-center'>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-6 text-sm'
          onMouseDown={(e) => {
            e.preventDefault()
            onUpdate({ fontSize: Math.max(1, layer.fontSize - 1) })
          }}
          tabIndex={-1}
        >
          −
        </Button>
        <span className='w-8 text-center text-xs tabular-nums'>{layer.fontSize}</span>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-6 text-sm'
          onMouseDown={(e) => {
            e.preventDefault()
            onUpdate({ fontSize: Math.min(999, layer.fontSize + 1) })
          }}
          tabIndex={-1}
        >
          +
        </Button>
      </div>

      {/* Color swatch */}
      <div
        className='flex h-7 w-7 items-center justify-center overflow-hidden rounded border'
        title={t('imageEditor.layers.textColor')}
      >
        <input
          type='color'
          value={colorHex}
          onChange={(e) => onUpdate({ color: e.target.value.replace('#', '') })}
          className='h-9 w-9 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent p-0'
          tabIndex={-1}
        />
      </div>

      <div className='bg-border mx-0.5 h-5 w-px' />

      {/* Text alignment */}
      <ToggleGroup
        type='single'
        value={layer.align}
        onValueChange={(v) => {
          if (v) onUpdate({ align: v as TextAlign })
        }}
        className='gap-0'
      >
        <ToggleGroupItem
          value='low'
          size='sm'
          className='h-7 w-7 p-0'
          title='Left'
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignLeft className='h-3.5 w-3.5' />
        </ToggleGroupItem>
        <ToggleGroupItem
          value='centre'
          size='sm'
          className='h-7 w-7 p-0'
          title='Center'
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignCenter className='h-3.5 w-3.5' />
        </ToggleGroupItem>
        <ToggleGroupItem
          value='high'
          size='sm'
          className='h-7 w-7 p-0'
          title='Right'
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignRight className='h-3.5 w-3.5' />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className='bg-border mx-0.5 h-5 w-px' />

      {/* Done */}
      <Button
        variant='default'
        size='sm'
        className='h-7 px-2 text-xs'
        onMouseDown={(e) => {
          e.preventDefault()
          onDone()
        }}
        tabIndex={-1}
      >
        <Check className='mr-1 h-3 w-3' />
        Done
      </Button>
    </div>
  )
}
