import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic } from 'lucide-react'

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
  /** Ref to the canvas-sized container div, used to compute screen coordinates. */
  canvasContainerRef: React.RefObject<HTMLElement | null>
  toolbarRef: React.RefObject<HTMLDivElement | null>
  onUpdate: (updates: Partial<TextLayer>) => void
  /** Text alignment — toolbar anchor follows the text anchor point. */
  align?: TextLayer['align']
}

/**
 * Font-size number input — updates draft state immediately on every valid change.
 * Since this only touches draftLayer (not the final render), live updates are fine.
 * The stepper arrows (↑/↓) work because we don't preventDefault on mousedown.
 * We stop propagation so the overlay's background-click-to-commit doesn't fire.
 */
function FontSizeInput({
  fontSize,
  onUpdate,
}: {
  fontSize: number
  onUpdate: (updates: Partial<TextLayer>) => void
}) {
  // Local string state so the user can type freely (e.g. clear field before typing new value)
  const [localValue, setLocalValue] = useState(String(fontSize))
  const inputRef = useRef<HTMLInputElement>(null)

  // Always sync from external changes (e.g. drag handle) — including while focused.
  // This lets the drag handle update the displayed value in real time.
  // We use useEffect so it runs after render and doesn't conflict with onChange.
  const prevFontSizeRef = useRef(fontSize)
  if (prevFontSizeRef.current !== fontSize) {
    prevFontSizeRef.current = fontSize
    setLocalValue(String(fontSize))
  }

  return (
    <input
      ref={inputRef}
      type='number'
      value={localValue}
      min={4}
      step={1}
      className='border-input bg-background h-8 w-16 rounded border px-1 text-center text-sm tabular-nums'
      title='Font size'
      onBlur={() => {
        // Reset display to last valid value if field was left empty/invalid
        setLocalValue(String(fontSize))
      }}
      onChange={(e) => {
        const raw = e.target.value
        setLocalValue(raw)
        const v = parseInt(raw, 10)
        // Update draft immediately for any valid value
        if (!isNaN(v) && v >= 4) {
          onUpdate({ fontSize: v })
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setLocalValue(String(fontSize))
          inputRef.current?.blur()
        }
        // Stop propagation so canvas shortcuts don't fire while typing
        // but allow ArrowUp/Down so the native stepper works
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
          e.stopPropagation()
        }
      }}
      // Stop propagation so the overlay background-click-to-commit doesn't fire
      onMouseDown={(e) => e.stopPropagation()}
    />
  )
}

// label = what the user sees; value = font param sent to imagor; cssFamily = preview style
const FONTS: { label: string; value: string; cssFamily: string }[] = [
  { label: 'Sans', value: 'sans', cssFamily: 'sans-serif' },
  { label: 'Serif', value: 'serif', cssFamily: 'serif' },
  { label: 'Monospace', value: 'monospace', cssFamily: 'monospace' },
]

export function TextEditToolbar({
  layer,
  leftFrac,
  rightFrac,
  topFrac,
  canvasContainerRef,
  toolbarRef,
  onUpdate,
  align,
}: TextEditToolbarProps) {
  const { t } = useTranslation()

  // ── Fixed-position placement via portal ───────────────────────────────────
  // The toolbar is rendered into document.body via createPortal so it escapes
  // any overflow:hidden ancestor and can overlay the editor header when the
  // layer is near the top of the canvas.
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
  })

  const computePosition = useCallback(() => {
    const container = canvasContainerRef.current
    const toolbar = toolbarRef.current
    if (!container || !toolbar) return

    const rect = container.getBoundingClientRect()
    const canvasTopScreen = rect.top + topFrac * rect.height
    const canvasLeftScreen = rect.left + leftFrac * rect.width
    const canvasRightScreen = rect.left + rightFrac * rect.width
    const canvasCenterScreen = (canvasLeftScreen + canvasRightScreen) / 2
    const toolbarW = toolbar.offsetWidth

    // Always render above the layer top edge; use bottom so it doesn't shift
    // if the toolbar itself changes height.
    // Clamp so the toolbar never disappears above the viewport when text grows
    // upward past the top of the screen.
    const bottomFixed = Math.min(
      window.innerHeight - canvasTopScreen + 4,
      window.innerHeight - toolbar.offsetHeight,
    )

    // Horizontal anchor follows text alignment (Canva/Figma-style UX):
    //   left-aligned  → anchor toolbar to left edge of text box
    //   center-aligned → center toolbar over text box
    //   right-aligned  → anchor toolbar to right edge of text box
    // Fall back gracefully if there's not enough screen space.
    const MARGIN = 8
    let left: number | undefined
    let right: number | undefined
    let transform: string | undefined

    if (align === 'centre') {
      // Center: try to center the toolbar over the text box
      const idealLeft = canvasCenterScreen - toolbarW / 2
      if (idealLeft >= MARGIN && idealLeft + toolbarW <= window.innerWidth - MARGIN) {
        left = idealLeft
      } else if (idealLeft < MARGIN) {
        left = MARGIN
      } else {
        left = window.innerWidth - toolbarW - MARGIN
      }
    } else if (align === 'high') {
      // Right-aligned: anchor to right edge, fall back to left-anchor if no space
      const spaceToLeft = canvasRightScreen
      if (spaceToLeft >= toolbarW + MARGIN) {
        right = window.innerWidth - canvasRightScreen
      } else {
        left = Math.max(MARGIN, canvasLeftScreen)
      }
    } else {
      // Left-aligned (default): anchor to left edge, fall back to right-anchor or center
      const spaceToRight = window.innerWidth - canvasLeftScreen
      const spaceToLeft = canvasRightScreen
      if (spaceToRight >= toolbarW + MARGIN) {
        left = canvasLeftScreen
      } else if (spaceToLeft >= toolbarW + MARGIN) {
        right = window.innerWidth - canvasRightScreen
      } else {
        left = canvasCenterScreen
        transform = 'translateX(-50%)'
      }
    }

    setFixedStyle({
      position: 'fixed',
      bottom: bottomFixed,
      left,
      right,
      transform,
      zIndex: 9999,
      pointerEvents: 'auto',
      whiteSpace: 'nowrap',
      visibility: 'visible',
    })
  }, [canvasContainerRef, toolbarRef, topFrac, leftFrac, rightFrac, align])

  // Recompute on every relevant change.
  useLayoutEffect(() => {
    computePosition()
  }, [computePosition])

  // Recompute when the canvas container or toolbar resizes, or when any
  // ancestor scrolls (e.g. the zoomed preview container).
  const observersRef = useRef<ResizeObserver[]>([])
  useLayoutEffect(() => {
    const observers = [new ResizeObserver(computePosition), new ResizeObserver(computePosition)]
    observersRef.current = observers
    if (canvasContainerRef.current) observers[0].observe(canvasContainerRef.current)
    if (toolbarRef.current) observers[1].observe(toolbarRef.current)

    // Capture-phase scroll catches scroll events from any element, including
    // the zoomed preview container, without needing a ref to it.
    window.addEventListener('scroll', computePosition, { capture: true, passive: true })

    return () => {
      observers.forEach((o) => o.disconnect())
      window.removeEventListener('scroll', computePosition, { capture: true })
    }
  }, [canvasContainerRef, toolbarRef, computePosition])

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

  // ── Render (via portal so it overlays the header) ─────────────────────────

  return createPortal(
    <div
      ref={toolbarRef}
      style={fixedStyle}
      className='bg-background/95 border-border flex items-center gap-1 rounded-md border px-1.5 py-1 shadow-lg backdrop-blur-sm'
      // Prevent the overlay's background onMouseDown (which commits) from firing
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Bold */}
      <Button
        variant={hasBold ? 'default' : 'ghost'}
        size='icon'
        className='h-8 w-8'
        onMouseDown={toggleBold}
        tabIndex={-1}
        title='Bold'
      >
        <Bold />
      </Button>

      {/* Italic */}
      <Button
        variant={hasItalic ? 'default' : 'ghost'}
        size='icon'
        className='h-8 w-8'
        onMouseDown={toggleItalic}
        tabIndex={-1}
        title='Italic'
      >
        <Italic />
      </Button>

      <div className='bg-border mx-0.5 h-5 w-px' />

      {/* Font family */}
      <Select value={layer.font} onValueChange={(v) => onUpdate({ font: v })}>
        <SelectTrigger
          className='h-8 w-32'
          // preventDefault keeps focus on the textarea while still opening the dropdown
          onMouseDown={(e) => e.preventDefault()}
        >
          <SelectValue>
            <span style={{ fontFamily: FONTS.find((f) => f.value === layer.font)?.cssFamily }}>
              {FONTS.find((f) => f.value === layer.font)?.label ?? layer.font}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((f) => (
            <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.cssFamily }}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font size — inline number input with stepper */}
      <FontSizeInput fontSize={layer.fontSize} onUpdate={onUpdate} />

      {/* Color swatch */}
      <div
        className='relative h-8 w-8 cursor-pointer overflow-hidden rounded border'
        title={t('imageEditor.layers.textColor')}
      >
        <input
          type='color'
          value={colorHex}
          onChange={(e) => onUpdate({ color: e.target.value.replace('#', '') })}
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
          tabIndex={-1}
        />
        <div className='h-full w-full rounded' style={{ backgroundColor: colorHex }} />
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
        <ToggleGroupItem value='low' size='sm' title='Left' onMouseDown={(e) => e.preventDefault()}>
          <AlignLeft />
        </ToggleGroupItem>
        <ToggleGroupItem
          value='centre'
          size='sm'
          title='Center'
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignCenter />
        </ToggleGroupItem>
        <ToggleGroupItem
          value='high'
          size='sm'
          title='Right'
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignRight />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Justify toggle */}
      <Button
        variant={layer.justify ? 'default' : 'ghost'}
        size='icon'
        className='h-8 w-8'
        onMouseDown={(e) => {
          e.preventDefault()
          onUpdate({ justify: !layer.justify })
        }}
        tabIndex={-1}
        title='Justify'
      >
        <AlignJustify />
      </Button>
    </div>,
    document.body,
  )
}
