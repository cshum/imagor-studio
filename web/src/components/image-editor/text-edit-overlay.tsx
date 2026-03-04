import { useCallback, useEffect, useRef, useState } from 'react'

import type { TextLayer } from '@/lib/image-editor'
import { calculateTextLayerBoundingBox } from '@/lib/layer-dimensions'
import { calculateLayerPosition } from '@/lib/layer-position'

interface TextEditOverlayProps {
  layer: TextLayer
  baseImageWidth: number
  baseImageHeight: number
  paddingLeft?: number
  paddingTop?: number
  onCommit: (text: string) => void
  onCancel: () => void
}

/**
 * Full-overlay text editor — renders a `<textarea>` absolutely positioned
 * over the text layer's bounding region.  The overlay captures keyboard
 * events so Escape cancels and Ctrl/Cmd+Enter commits.
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
}: TextEditOverlayProps) {
  const [value, setValue] = useState(layer.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus the textarea when mounted
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Place cursor at end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [])

  // Keep value in sync if the layer text changes externally
  useEffect(() => {
    setValue(layer.text)
  }, [layer.text])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onCommit(value)
      }
      // Stop propagation so canvas keyboard shortcuts don't fire while editing
      e.stopPropagation()
    },
    [value, onCommit, onCancel],
  )

  const handleBlur = useCallback(() => {
    // Blur = commit current value
    onCommit(value)
  }, [value, onCommit])

  // Calculate position as percentage of the total canvas
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

  // Width as a percentage of total canvas (0 = full width)
  const wPercent = layerDims.width > 0 ? `${(layerDims.width / baseImageWidth) * 100}%` : '80%'

  // Approximate font size in percentage
  // The canvas is rendered at `baseImageWidth` logical pixels but displayed at
  // its intrinsic CSS pixel size (which matches 100% for the overlay container).
  // Since the overlay is 100% wide = baseImageWidth logical px, we express font
  // size in the same logical-px units via CSS em/px is fine here because the
  // overlay div takes the full image size in CSS px.
  //
  // We store fontSize as imagor pts (72 dpi → 1pt ≈ 1.333 CSS px at 96dpi).
  // For a close-enough approximation, just use `fontSize` as plain px here.
  const fontSizePct = `${(layer.fontSize / baseImageHeight) * 100}%`

  // Map imagor font family name to CSS font-family
  const cssFontFamily = layer.font || 'sans-serif'

  const fontWeight = layer.fontStyle.includes('bold') ? 'bold' : 'normal'
  const fontStyle = layer.fontStyle.includes('italic') ? 'italic' : 'normal'

  return (
    /* Capture-layer: forwards clicks on the background to cancel */
    <div
      className='pointer-events-auto absolute inset-0 z-30'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          onCommit(value)
        }
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={1}
        spellCheck={false}
        style={{
          position: 'absolute',
          left: leftPercent,
          top: topPercent,
          width: wPercent,
          minWidth: '4em',
          // Use inline font size relative to font size / canvas height
          fontSize: fontSizePct,
          fontFamily: cssFontFamily,
          fontWeight,
          fontStyle,
          color: `#${layer.color}`,
          // Transparent/glass look so the server render underneath is visible as reference
          background: 'rgba(255,255,255,0.15)',
          border: '2px dashed rgba(255,255,255,0.8)',
          outline: 'none',
          resize: 'none',
          padding: '2px 4px',
          lineHeight: '1.4',
          overflow: 'hidden',
          boxSizing: 'border-box',
          backdropFilter: 'blur(1px)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          borderRadius: '2px',
          // White text-shadow for contrast on dark backgrounds
          textShadow: '0 0 4px rgba(0,0,0,0.3)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          // Rows auto-expand via JS below; start at 1 row
          height: 'auto',
        }}
      />
    </div>
  )
}
