import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { TextEditToolbar } from '@/components/image-editor/text-edit-toolbar'
import type { TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'
import { calculateLayerPosition } from '@/lib/layer-position'

/** Photoshop-style white square handle dot — matches LayerOverlay */
function HandleDot() {
  return (
    <div
      className='h-2 w-2 border border-black bg-white'
      style={{ boxShadow: '0 0 0 1px white' }}
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
 * over the text layer's bounding region, plus a floating `TextEditToolbar`.
 *
 * The textarea always wraps at the layer's bounding-box width and auto-grows
 * in height to fit content — it never clips or scrolls during editing.
 * `layer.height` is a server-side render-clip value only and is not reflected
 * in the editing UI.
 *
 * Right-edge drag handle — drag to change wrap width, double-click to reset.
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
  // Draft layer state — toolbar changes are buffered here and only flushed to the
  // parent onUpdate on commit. This avoids triggering a new imagor preview load
  // for every bold/italic/font/color/size change during editing.
  const [draftLayer, setDraftLayer] = useState<TextLayer>(layer)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Timer ref for deferred blur — avoids premature commit when focus moves into toolbar
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Measured pixel height of the overlay container — used to convert imagor px → display px
  const [containerHeightPx, setContainerHeightPx] = useState(0)
  // Kept in sync with `scale` so callbacks always see the latest value without re-creating
  const scaleRef = useRef(1)

  // Track containerHeightPx with a ResizeObserver on the full-canvas container div
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerHeightPx(el.clientHeight)
    const ro = new ResizeObserver(() => setContainerHeightPx(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Focus the textarea on mount and select all text so typing immediately replaces the prefill.
  // Use a short delay so the textarea focus wins over any dropdown/menu close focus-restoration.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      }
    }, 50)
    return () => {
      clearTimeout(timer)
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  // Note: we intentionally do NOT sync value from layer.text here.
  // The textarea owns the draft text; layer.text is only updated on blur/commit.

  // On commit: flush all draft layer changes + text to the parent in one atomic call.
  // This avoids triggering multiple imagor preview reloads during editing.
  const doCommit = useCallback(() => {
    const heightPx = textareaRef.current?.scrollHeight ?? 0
    const contentHeight = scaleRef.current > 0 ? Math.round(heightPx / scaleRef.current) : 0
    // Compute diff between draftLayer and original layer — only send changed fields
    const draft = draftLayer
    const updates: Partial<TextLayer> = { text: value }
    if (contentHeight > 0)
      updates.height = contentHeight
      // Include all draft fields that differ from the original layer
    ;(Object.keys(draft) as (keyof TextLayer)[]).forEach((k) => {
      if (draft[k] !== (layer as TextLayer)[k]) {
        ;(updates as Record<string, unknown>)[k] = draft[k]
      }
    })
    onUpdate(updates)
    onCommit(value)
  }, [value, draftLayer, layer, onUpdate, onCommit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        doCommit()
      }
      // Stop propagation so canvas keyboard shortcuts don't fire while editing
      e.stopPropagation()
    },
    [doCommit, onCancel],
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
      doCommit()
    }, 120)
  }, [doCommit])

  // ── Position & size ────────────────────────────────────────────────────────

  // Live textarea height in canvas pixels — updated by the auto-grow useLayoutEffect.
  // Initialized from the layer's bounding box so the first render is correct.
  // Used instead of layerDims.height for Y positioning so center/bottom anchors
  // track the growing text box in real time.
  const [liveHeightCanvasPx, setLiveHeightCanvasPx] = useState(() => {
    const dims = calculateTextLayerBoundingBox(layer, {
      width: baseImageWidth,
      height: baseImageHeight,
    })
    return dims.height
  })

  // All position and size values are derived from draftLayer so that:
  // - Width drag: wrapper resizes live as draftLayer.width changes
  // - Alignment change (toolbar): wrapper repositions immediately when
  //   draftLayer.x/y changes to 'center', 'right', etc.
  // calculateLayerPosition handles 'center' and 'right' anchoring correctly,
  // so using draftLayer.x/y is all that's needed for proper positioning.
  const layerDims = calculateTextLayerBoundingBox(draftLayer, {
    width: baseImageWidth,
    height: baseImageHeight,
  })
  // Use live textarea height for Y positioning so center/bottom anchors track
  // the growing text box in real time. liveHeightCanvasPx starts at layerDims.height
  // and is updated by the auto-grow useLayoutEffect on every text/font change.
  const { leftPercent, topPercent } = calculateLayerPosition(
    draftLayer.x,
    draftLayer.y,
    layerDims.width,
    liveHeightCanvasPx,
    baseImageWidth,
    baseImageHeight,
    paddingLeft,
    paddingTop,
  )

  // 0–1 fractions for toolbar placement
  const topFrac = parseFloat(topPercent) / 100
  const leftFrac = parseFloat(leftPercent) / 100
  const widthFrac = layerDims.width / baseImageWidth
  const rightFrac = leftFrac + widthFrac

  // When align changes via the toolbar, also reposition x so the visual anchor
  // matches: left→left-anchor, centre→center-anchor, high→right-anchor.
  // All changes are buffered into draftLayer — no parent onUpdate until commit.
  const handleToolbarUpdate = (updates: Partial<TextLayer>) => {
    if ('align' in updates && updates.align !== draftLayer.align) {
      const newAlign = updates.align!
      const visualLeft = Math.round(leftFrac * baseImageWidth)
      let newX: number | string
      if (newAlign === 'centre') {
        newX = 'center'
      } else if (newAlign === 'high') {
        const d = baseImageWidth - layerDims.width - visualLeft
        newX = d === 0 ? 'right' : d < 0 ? `right-${-d}` : -d
      } else {
        newX = visualLeft === 0 ? 'left' : visualLeft < 0 ? `left-${-visualLeft}` : visualLeft
      }
      setDraftLayer((prev) => ({ ...prev, ...updates, x: newX }))
    } else {
      setDraftLayer((prev) => ({ ...prev, ...updates }))
    }
  }

  // Uniform scale: imagor canvas pixels → display pixels
  const scale = containerHeightPx > 0 ? containerHeightPx / baseImageHeight : 1
  scaleRef.current = scale

  // Typography — derived from draftLayer so the textarea reflects toolbar changes immediately
  const fontSizePx = `${draftLayer.fontSize * scale}px`
  const lineHeightPx = `${(draftLayer.fontSize + (draftLayer.spacing ?? 0)) * scale}px`
  const cssFontFamily = imagorFontToCss(draftLayer.font)
  const fontWeight = draftLayer.fontStyle.includes('bold') ? 'bold' : 'normal'
  const fontItalic = draftLayer.fontStyle.includes('italic') ? 'italic' : 'normal'
  const textAlign = draftLayer.justify
    ? 'justify'
    : draftLayer.align === 'centre'
      ? 'center'
      : draftLayer.align === 'high'
        ? 'right'
        : 'left'

  // Map imagor wrap mode → CSS for the editor textarea.
  // The goal is good editor UX (no invisible overflow) while staying close to Pango's behaviour.
  // Pango 'word'     → wraps at word boundaries; long words overflow in render but we use
  //                    overflow-wrap:break-word in the editor so they wrap gracefully (no hyphens)
  // Pango 'char'     → break at any character — CSS word-break: break-all
  // Pango 'wordchar' → word first, then char fallback — CSS overflow-wrap: break-word
  // Pango 'none'     → no wrapping at all — white-space: pre
  const cssWhiteSpace = draftLayer.wrap === 'none' ? 'pre' : 'pre-wrap'
  const cssWordBreak = draftLayer.wrap === 'char' ? 'break-all' : 'normal'
  // All wrapping modes use break-word so long words never disappear in the editor
  const cssOverflowWrap = draftLayer.wrap === 'none' ? 'normal' : 'break-word'

  // ── Auto-grow height (always — textarea never scrolls or clips) ──────────
  // containerHeightPx in deps: scale changes when the preview area resizes, which
  // changes the rendered font size, which changes scrollHeight — recalculate then.
  useLayoutEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current
      el.style.height = '0px'
      el.style.height = `${el.scrollHeight}px`
      // Update live canvas height so center/bottom anchors reposition correctly
      const currentScale = scaleRef.current
      if (currentScale > 0) {
        setLiveHeightCanvasPx(Math.round(el.scrollHeight / currentScale))
      }
    }
  }, [value, draftLayer.fontSize, draftLayer.spacing, draftLayer.width, containerHeightPx])

  // ── Width-resize drag handle (left edge for right-aligned, right edge otherwise) ─────

  // 'left' means handle is on left edge (right-aligned text); 'right' means right edge
  const [resizeDrag, setResizeDrag] = useState<'left' | 'right' | null>(null)
  // Capture all drag-start state in a ref so the mousemove closure never goes stale.
  // Crucially isFill is captured once at mouseDown — reading layer.width inside the
  // effect deps would tear down and re-register the listener on every onUpdate call.
  const resizeDragStartRef = useRef({ x: 0, initial: 0, isFill: false, canvasWidth: 0 })

  useEffect(() => {
    if (!resizeDrag || scale <= 0) return

    const handleMouseMove = (e: MouseEvent) => {
      const rawDelta = e.clientX - resizeDragStartRef.current.x
      // Left-edge: drag left = wider (negate). Center: both edges are symmetric so ×2.
      const multiplier = draftLayer.align === 'centre' ? 2 : 1
      const deltaX = resizeDrag === 'left' ? -rawDelta * multiplier : rawDelta * multiplier
      const newWidth = Math.round(
        Math.max(draftLayer.fontSize * 2, resizeDragStartRef.current.initial + deltaX / scale),
      )
      // isFill was captured at mouseDown — stays stable for the whole drag
      if (resizeDragStartRef.current.isFill) {
        const inset = Math.max(0, resizeDragStartRef.current.canvasWidth - newWidth)
        setDraftLayer((prev) => ({ ...prev, width: inset === 0 ? 'f' : `f-${inset}` }))
      } else {
        setDraftLayer((prev) => ({ ...prev, width: newWidth }))
      }
    }

    const handleMouseUp = () => setResizeDrag(null)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizeDrag, scale, draftLayer.fontSize, draftLayer.align])

  // ── Font-size resize drag handle (bottom edge) ────────────────────────────
  // Dragging down increases fontSize, dragging up decreases it.
  // The delta is divided by lineCount so the visual change is proportional
  // to the drag distance regardless of how many lines the text spans.

  const [fontResizeDragging, setFontResizeDragging] = useState(false)
  const fontResizeDragStartRef = useRef({
    y: 0,
    initialFontSize: 0,
    lineCount: 1,
    spacing: 0,
  })

  // Dynamic font size limits — max scales with the canvas so large canvases
  // (e.g. 4000px) aren't artificially capped at 500px.
  const MIN_FONT_SIZE = 4
  useEffect(() => {
    if (!fontResizeDragging || scale <= 0) return

    const handleMouseMove = (e: MouseEvent) => {
      const { y, initialFontSize, lineCount, spacing } = fontResizeDragStartRef.current
      // Convert display-pixel delta to imagor-pixel delta
      const deltaImagor = (e.clientY - y) / scale
      // Spread the delta evenly across all lines
      const newLineHeight = Math.max(
        MIN_FONT_SIZE + spacing,
        initialFontSize + spacing + deltaImagor / lineCount,
      )
      const newFontSize = Math.round(Math.max(MIN_FONT_SIZE, newLineHeight - spacing))
      setDraftLayer((prev) => ({ ...prev, fontSize: newFontSize }))
    }

    const handleMouseUp = () => setFontResizeDragging(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [fontResizeDragging, scale])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    /* Capture-layer: clicks on the background commit the edit */
    <div
      ref={containerRef}
      className='pointer-events-auto absolute inset-0 z-30'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          doCommit()
        }
      }}
    >
      {/* Floating typography toolbar — receives draftLayer so it reflects local changes */}
      <TextEditToolbar
        layer={draftLayer}
        leftFrac={leftFrac}
        rightFrac={rightFrac}
        topFrac={topFrac}
        canvasContainerRef={containerRef}
        toolbarRef={toolbarRef}
        onUpdate={handleToolbarUpdate}
        align={draftLayer.align}
      />

      {/*
       * Wrapper div — always sized to the layer's bounding-box width.
       * Height is not set; the wrapper grows with the textarea.
       */}
      <div
        style={{
          position: 'absolute',
          left: leftPercent,
          top: topPercent,
          width: `${widthFrac * 100}%`,
          border: '1px solid white',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.5)',
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
            // Height driven entirely by useLayoutEffect (auto-grow). Never fixed, never scrolls.
            minHeight: lineHeightPx,
            fontSize: fontSizePx,
            lineHeight: lineHeightPx,
            fontFamily: cssFontFamily,
            fontWeight,
            fontStyle: fontItalic,
            textAlign,
            color: `#${draftLayer.color}`,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '0',
            overflow: 'hidden',
            boxSizing: 'border-box',
            whiteSpace: cssWhiteSpace,
            wordBreak: cssWordBreak,
            overflowWrap: cssOverflowWrap,
            caretColor: `#${draftLayer.color}`,
          }}
        />

        {/* ── Width resize handle(s) ──────────────────────────────────────────────────────
             Left-aligned  → right edge only
             Right-aligned → left edge only
             Center        → both edges (symmetric expansion, delta ×2) ── */}
        {['low', 'centre'].includes(draftLayer.align) && (
          <div
            className='absolute top-1/2 -right-2.5 flex h-8 w-5 -translate-y-1/2 cursor-ew-resize items-center justify-center'
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setResizeDrag('right')
              resizeDragStartRef.current = {
                x: e.clientX,
                initial: layerDims.width,
                isFill:
                  typeof draftLayer.width === 'string' &&
                  /^(?:f|full)(-\d+)?$/.test(draftLayer.width),
                canvasWidth: baseImageWidth,
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDraftLayer((prev) => ({ ...prev, width: 0 }))
            }}
          >
            <HandleDot />
          </div>
        )}
        {['high', 'centre'].includes(draftLayer.align) && (
          <div
            className='absolute top-1/2 -left-2.5 flex h-8 w-5 -translate-y-1/2 cursor-ew-resize items-center justify-center'
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setResizeDrag('left')
              resizeDragStartRef.current = {
                x: e.clientX,
                initial: layerDims.width,
                isFill:
                  typeof draftLayer.width === 'string' &&
                  /^(?:f|full)(-\d+)?$/.test(draftLayer.width),
                canvasWidth: baseImageWidth,
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDraftLayer((prev) => ({ ...prev, width: 0 }))
            }}
          >
            <HandleDot />
          </div>
        )}

        {/* ── Font-size resize handle (bottom edge) ──────────────────────────
             Drag down → larger font, drag up → smaller font.
             Delta is divided by lineCount so the change is proportional
             to drag distance regardless of how many lines the text spans. ── */}
        <div
          className='absolute -bottom-2.5 left-1/2 flex h-5 w-8 -translate-x-1/2 cursor-ns-resize items-center justify-center'
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const el = textareaRef.current
            const lineHeightDisplayPx = (draftLayer.fontSize + (draftLayer.spacing ?? 0)) * scale
            const lineCount =
              el && lineHeightDisplayPx > 0
                ? Math.max(1, Math.round(el.scrollHeight / lineHeightDisplayPx))
                : 1
            fontResizeDragStartRef.current = {
              y: e.clientY,
              initialFontSize: draftLayer.fontSize,
              lineCount,
              spacing: draftLayer.spacing ?? 0,
            }
            setFontResizeDragging(true)
          }}
        >
          <HandleDot />
        </div>
      </div>
    </div>
  )
}
