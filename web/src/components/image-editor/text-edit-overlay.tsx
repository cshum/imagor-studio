import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { TextEditToolbar } from '@/components/image-editor/text-edit-toolbar'
import type { TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'
import { calculateLayerPosition } from '@/lib/layer-position'

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
 * This is mounted inside the percentage-based overlay <div> that already
 * covers the rendered image, so all coordinates are expressed as percentages
 * of the total canvas (including padding).
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
  // Measured pixel height of the overlay container — used to derive font-size in px
  const [containerHeightPx, setContainerHeightPx] = useState(0)

  // Keep containerHeightPx in sync with the actual rendered overlay size
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerHeightPx(el.clientHeight)
    const ro = new ResizeObserver(() => setContainerHeightPx(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Focus the textarea when mounted
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
    // If focus lands inside the toolbar or back in the textarea, cancel the commit.
    blurTimerRef.current = setTimeout(() => {
      const active = document.activeElement
      if (textareaRef.current?.contains(active) || toolbarRef.current?.contains(active)) {
        return // focus stayed within the editing UI — don't commit yet
      }
      // Sync final text to layer then close
      onUpdate({ text: value })
      onCommit(value)
    }, 120)
  }, [value, onCommit, onUpdate])

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

  // Convert string percentages to 0-1 fractions for toolbar placement logic
  const topFrac = parseFloat(topPercent) / 100
  const leftFrac = parseFloat(leftPercent) / 100
  const heightFrac = layerDims.height / baseImageHeight
  const widthFrac = layerDims.width / baseImageWidth
  // All four layer edges as canvas fractions
  const rightFrac = leftFrac + widthFrac
  const bottomFrac = topFrac + heightFrac

  // Size as percentages of total canvas — matches the rendered bounding box exactly
  const wPercent = layerDims.width > 0 ? `${widthFrac * 100}%` : '80%'
  const hPercent = layerDims.height > 0 ? `${heightFrac * 100}%` : undefined

  // font-size in px: scale imagor canvas pixels → display pixels using measured container height
  // CSS font-size % is relative to parent font-size (not container height), so we must use px.
  const scale = containerHeightPx > 0 ? containerHeightPx / baseImageHeight : 1
  const fontSizePx = `${layer.fontSize * scale}px`
  // lineHeight = fontSize + spacing in the same imagor pixel space, scaled to display px
  const lineHeightPx = `${(layer.fontSize + (layer.spacing ?? 0)) * scale}px`
  const cssFontFamily = imagorFontToCss(layer.font)
  const fontWeight = layer.fontStyle.includes('bold') ? 'bold' : 'normal'
  const fontStyle = layer.fontStyle.includes('italic') ? 'italic' : 'normal'
  const textAlign = layer.align === 'centre' ? 'center' : layer.align === 'high' ? 'right' : 'left'

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
      {/* Floating typography toolbar — above or below the textarea */}
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

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        spellCheck={false}
        style={{
          position: 'absolute',
          left: leftPercent,
          top: topPercent,
          width: wPercent,
          height: hPercent,
          minWidth: '4em',
          minHeight: '1em',
          fontSize: fontSizePx,
          lineHeight: lineHeightPx,
          fontFamily: cssFontFamily,
          fontWeight,
          fontStyle,
          textAlign,
          color: `#${layer.color}`,
          background: 'rgba(255,255,255,0.08)',
          border: '2px dashed rgba(255,255,255,0.8)',
          outline: 'none',
          resize: 'none',
          padding: '0',
          overflow: hPercent ? 'auto' : 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          borderRadius: '2px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
    </div>
  )
}
