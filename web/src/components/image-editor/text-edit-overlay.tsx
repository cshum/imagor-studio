import { useCallback, useEffect, useRef, useState } from 'react'

import { TextEditToolbar } from '@/components/image-editor/text-edit-toolbar'
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
  // Timer ref for deferred blur — avoids premature commit when focus moves into toolbar
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    // Defer the commit so focus can settle on a toolbar element first.
    // If focus lands inside the toolbar or back in the textarea, cancel the commit.
    blurTimerRef.current = setTimeout(() => {
      const active = document.activeElement
      if (textareaRef.current?.contains(active) || toolbarRef.current?.contains(active)) {
        return // focus stayed within the editing UI — don't commit yet
      }
      onCommit(value)
    }, 120)
  }, [value, onCommit])

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

  // Width as a percentage of total canvas
  const wPercent = layerDims.width > 0 ? `${widthFrac * 100}%` : '80%'

  const fontSizePct = `${(layer.fontSize / baseImageHeight) * 100}%`
  const cssFontFamily = layer.font || 'sans-serif'
  const fontWeight = layer.fontStyle.includes('bold') ? 'bold' : 'normal'
  const fontStyle = layer.fontStyle.includes('italic') ? 'italic' : 'normal'

  return (
    /* Capture-layer: clicks on the background commit the edit */
    <div
      className='pointer-events-auto absolute inset-0 z-30'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
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
        onDone={() => onCommit(value)}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value
          setValue(newValue)
          // Live-sync the text so the layer always has the latest value.
          // This means sidebar / toolbar "Done" only needs to end the
          // editing session — no text update required at commit time.
          onUpdate({ text: newValue })
        }}
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
          fontSize: fontSizePct,
          fontFamily: cssFontFamily,
          fontWeight,
          fontStyle,
          color: `#${layer.color}`,
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
          textShadow: '0 0 4px rgba(0,0,0,0.3)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          height: 'auto',
        }}
      />
    </div>
  )
}
