import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { TextEditToolbar } from '@/components/image-editor/text-edit-toolbar'
import type { TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'
import { calculateLayerPosition } from '@/lib/layer-position'

/** Rounded pill visual for edge-drag handles */
function HandlePill({ vertical }: { vertical?: boolean }) {
  return (
    <div
      style={{
        ...(vertical
          ? { width: 4, height: '40%', minHeight: 12 }
          : { height: 4, width: '40%', minWidth: 12 }),
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 3,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.55)',
        margin: 'auto',
      }}
    />
  )
}

/**
 * Convert an imagor font identifier to a CSS font-family string.
 * Imagor accepts short aliases ('sans', 'serif', 'monospace') that are
 * NOT valid CSS generic families — 'sans' in CSS is treated as an unknown
 * named font and falls back to the browser default serif, not sans-serif.
 */
export function imagorFontToCss(font: string | undefined): string {
  if (!font) return 'sans-serif'
  switch (font.toLowerCase()) {
    case 'sans':
      return 'sans-serif'
    case 'serif':
      return 'serif'
    case 'monospace':
    case 'mono':
      return 'monospace'
    default:
      // Named fonts (e.g. 'Noto Sans', 'DejaVu Sans') — use as-is with a
      // generic fallback so the browser degrades gracefully if not installed.
      return `"${font}", sans-serif`
  }
}

interface TextEditOverlayProps {
  layer: TextLayer
  baseImageWidth: number
  baseImageHeight: number
  paddingLeft?: number
  paddingTop?: number
  onCommit: (text: string) => void
  onCancel: () => void
  onUpdate: (updates: Partial<TextLayer>) => void
}

/**
 * Full-overlay text editor — renders a `<textarea>` absolutely positioned
 * over the text layer's bounding region, plus a floating `TextEditToolbar`
 * that appears above or below the textarea depending on available canvas space.
 *
 * Sizing modes (matching imagor's layer.width / layer.height semantics):
 *   width=0, height=0  → auto-width (no wrap, textarea spans to canvas right),
 *                         auto-height (grows to fit line count)
 *   width>0, height=0  → fixed wrap width, auto-height
 *   width>0, height>0  → fixed wrap width, fixed height (scrollable)
 *
 * Edge drag handles let the user set/reset width and height while editing.
 */
export function TextEditOverlay({
  layer,
  baseImageWidth,
  baseImageHeight,
  paddingLeft = 0,
  paddingTop = 0,
  onCommit,
  onCancel,
  onUpdate,
}: TextEditOverlayProps) {
  const [value, setValue] = useState(layer.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Timer ref for deferred blur — avoids premature commit when focus moves into toolbar
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Measured pixel height of the overlay container — used to convert imagor px → display px
  const [containerHeightPx, setContainerHeightPx] = useState(0)

  // Track containerHeightPx with a ResizeObserver on the full-canvas container div
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerHeightPx(el.clientHeight)
    const ro = new ResizeObserver(() => setContainerHeightPx(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Focus the textarea on mount, cursor at end
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  // Note: we intentionally do NOT sync value from layer.text here.
  // The textarea owns the draft text; layer.text is only updated on blur/commit.

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onUpdate({ text: value })
        onCommit(value)
      }
      // Stop propagation so canvas keyboard shortcuts don't fire while editing
      e.stopPropagation()
    },
    [value, onCommit, onCancel, onUpdate],
  )

  const handleBlur = useCallback(() => {
    // Defer the commit so focus can settle on a toolbar element first.
    blurTimerRef.current = setTimeout(() => {
      const active = document.activeElement
      if (textareaRef.current?.contains(active) || toolbarRef.current?.contains(active)) {
        return
      }
      // Radix portals (Select, Popover, etc.) render outside toolbarRef — don't commit.
      if (active?.closest('[data-radix-popper-content-wrapper],[data-radix-select-content]')) {
        return
      }
      onUpdate({ text: value })
      onCommit(value)
    }, 120)
  }, [value, onCommit, onUpdate])

  // ── Sizing mode ──────────────────────────────────────────────────────────

  const hasFixedWidth = typeof layer.width === 'number' && (layer.width as number) > 0
  const hasFixedHeight = typeof layer.height === 'number' && (layer.height as number) > 0

  // ── Position calculations ────────────────────────────────────────────────

  const layerDims = calculateTextLayerBoundingBox(layer, {
    width: baseImageWidth,
    height: baseImageHeight,
  })
  const { leftPercent, topPercent } = calculateLayerPosition(
    layer.x,
    layer.y,
    layerDims.width,
    layerDims.height,
    baseImageWidth,
    baseImageHeight,
    paddingLeft,
    paddingTop,
  )

  // 0–1 fractions for toolbar placement
  const topFrac = parseFloat(topPercent) / 100
  const leftFrac = parseFloat(leftPercent) / 100
  const heightFrac = layerDims.height / baseImageHeight
  const widthFrac = layerDims.width / baseImageWidth
  const rightFrac = leftFrac + widthFrac
  const bottomFrac = topFrac + heightFrac

  // Uniform scale: imagor canvas pixels → display pixels
  const scale = containerHeightPx > 0 ? containerHeightPx / baseImageHeight : 1

  // Typography
  const fontSizePx = `${layer.fontSize * scale}px`
  const lineHeightPx = `${(layer.fontSize + (layer.spacing ?? 0)) * scale}px`
  const cssFontFamily = imagorFontToCss(layer.font)
  const fontWeight = layer.fontStyle.includes('bold') ? 'bold' : 'normal'
  const fontItalic = layer.fontStyle.includes('italic') ? 'italic' : 'normal'
  const textAlign = layer.align === 'centre' ? 'center' : layer.align === 'high' ? 'right' : 'left'

  // ── Auto-grow height ─────────────────────────────────────────────────────
  // Runs after every value / font change when not in fixed-height mode.
  useLayoutEffect(() => {
    if (!hasFixedHeight && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = '0px' // Shrink to get accurate scrollHeight
      el.style.height = `${el.scrollHeight}px`
    }
  }, [value, hasFixedHeight, layer.fontSize, layer.spacing])

  // ── In-overlay edge drag handles ─────────────────────────────────────────

  const [resizeDrag, setResizeDrag] = useState<'right' | 'bottom' | null>(null)
  const resizeDragStartRef = useRef({ x: 0, y: 0, initial: 0 })

  useEffect(() => {
    if (!resizeDrag || scale <= 0) return

    const handleMouseMove = (e: MouseEvent) => {
      if (resizeDrag === 'right') {
        const deltaX = e.clientX - resizeDragStartRef.current.x
        const newWidth = Math.round(
          Math.max(layer.fontSize * 2, resizeDragStartRef.current.initial + deltaX / scale),
        )
        onUpdate({ width: newWidth })
      } else {
        const deltaY = e.clientY - resizeDragStartRef.current.y
        const newHeight = Math.round(
          Math.max(layer.fontSize, resizeDragStartRef.current.initial + deltaY / scale),
        )
        onUpdate({ height: newHeight })
      }
    }

    const handleMouseUp = () => setResizeDrag(null)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizeDrag, scale, onUpdate, layer.fontSize])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    /* Capture-layer: clicks on the background commit the edit */
    <div
      ref={containerRef}
      className='pointer-events-auto absolute inset-0 z-30'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          onUpdate({ text: value })
          onCommit(value)
        }
      }}
    >
      {/* Floating typography toolbar */}
      <TextEditToolbar
        layer={layer}
        leftFrac={leftFrac}
        rightFrac={rightFrac}
        topFrac={topFrac}
        bottomFrac={bottomFrac}
        toolbarRef={toolbarRef}
        onUpdate={onUpdate}
        onDone={() => {
          onUpdate({ text: value })
          onCommit(value)
        }}
      />

      {/*
       * Wrapper div — positioned at the layer's top-left corner.
       * In fixed-width mode: explicit width (percentage of canvas).
       * In auto-width mode: stretches from layer left to near the canvas right edge.
       * Height is not set here so the wrapper sizes to the textarea content.
       */}
      <div
        style={{
          position: 'absolute',
          left: leftPercent,
          top: topPercent,
          ...(hasFixedWidth ? { width: `${widthFrac * 100}%` } : { right: '1%' }),
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          spellCheck={false}
          style={{
            display: 'block',
            width: '100%',
            // Fixed height when layer.height > 0, otherwise auto (useLayoutEffect drives it)
            height: hasFixedHeight ? `${layerDims.height * scale}px` : undefined,
            minHeight: lineHeightPx,
            fontSize: fontSizePx,
            lineHeight: lineHeightPx,
            fontFamily: cssFontFamily,
            fontWeight,
            fontStyle: fontItalic,
            textAlign,
            color: `#${layer.color}`,
            background: 'rgba(255,255,255,0.08)',
            border: '2px dashed rgba(255,255,255,0.8)',
            outline: 'none',
            resize: 'none',
            padding: '0',
            overflow: hasFixedHeight ? 'auto' : 'hidden',
            boxSizing: 'border-box',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            borderRadius: '2px',
            // auto-width: no wrap (imagor renders without wrap); fixed-width: wrap at that width
            whiteSpace: hasFixedWidth ? 'pre-wrap' : 'nowrap',
            wordBreak: hasFixedWidth ? 'break-word' : 'normal',
          }}
        />

        {/* ── Right edge handle — drag to set wrap width, double-click to reset ── */}
        <div
          style={{
            position: 'absolute',
            right: -10,
            top: 0,
            bottom: 0,
            width: 20,
            cursor: 'ew-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setResizeDrag('right')
            resizeDragStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              initial: layerDims.width,
            }
          }}
          onDoubleClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onUpdate({ width: 0 }) // reset to auto-width
          }}
        >
          <HandlePill vertical />
        </div>

        {/* ── Bottom edge handle — drag to fix height, double-click to reset ── */}
        <div
          style={{
            position: 'absolute',
            bottom: -10,
            left: 0,
            right: 0,
            height: 20,
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setResizeDrag('bottom')
            resizeDragStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              initial: layerDims.height,
            }
          }}
          onDoubleClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onUpdate({ height: 0 }) // reset to auto-height
          }}
        >
          <HandlePill />
        </div>
      </div>
    </div>
  )
}
