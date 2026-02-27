import { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildDragUpdates,
  calculateOverlayLayout,
  convertDisplayToLayerPosition,
  resizeLayerWithCenterAwareness,
  type ResizeHandle,
} from '@/lib/layer-position'
import { cn } from '@/lib/utils'

interface LayerOverlayProps {
  layerX: string | number
  layerY: string | number
  layerWidth: number
  layerHeight: number
  onLayerChange: (updates: {
    x?: string | number
    y?: string | number
    transforms?: {
      width?: number
      height?: number
    }
  }) => void
  lockedAspectRatio: boolean
  baseImageWidth: number
  baseImageHeight: number
  paddingLeft?: number
  paddingTop?: number
  layerPaddingLeft?: number
  layerPaddingRight?: number
  layerPaddingTop?: number
  layerPaddingBottom?: number
  layerRotation?: number
  layerFillColor?: string
  onDeselect?: () => void
  onEnterEditMode?: () => void
}

export function LayerOverlay({
  layerX,
  layerY,
  layerWidth,
  layerHeight,
  onLayerChange,
  lockedAspectRatio,
  baseImageWidth,
  baseImageHeight,
  paddingLeft = 0,
  paddingTop = 0,
  layerPaddingLeft = 0,
  layerPaddingRight = 0,
  layerPaddingTop = 0,
  layerPaddingBottom = 0,
  layerRotation = 0,
  layerFillColor,
  onDeselect,
  onEnterEditMode,
}: LayerOverlayProps) {
  // Calculate CSS percentage strings, drag capabilities and alignment flags
  const { leftPercent, topPercent, widthPercent, heightPercent, canDragX, canDragY } =
    calculateOverlayLayout(
      layerX,
      layerY,
      layerWidth,
      layerHeight,
      baseImageWidth,
      baseImageHeight,
      paddingLeft,
      paddingTop,
    )

  const overlayRef = useRef<HTMLDivElement>(null)
  const layerBoxRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialState, setInitialState] = useState({
    displayX: 0,
    displayY: 0,
    displayWidth: 0,
    displayHeight: 0,
    overlayWidth: 0, // Store actual overlay dimensions for correct percentage calculation
    overlayHeight: 0,
  })

  // Handle mouse/touch down on layer box (for dragging)
  const handleLayerMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ((e.target as HTMLElement).classList.contains('layer-box')) {
        e.preventDefault()
        e.stopPropagation()

        // Only allow dragging if at least one axis is draggable
        if (!canDragX && !canDragY) return

        // Get actual pixel position from DOM element
        if (layerBoxRef.current && overlayRef.current) {
          const layerRect = layerBoxRef.current.getBoundingClientRect()
          const overlayRect = overlayRef.current.getBoundingClientRect()

          setIsDragging(true)
          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
          setDragStart({ x: clientX, y: clientY })
          setInitialState({
            displayX: layerRect.left - overlayRect.left,
            displayY: layerRect.top - overlayRect.top,
            displayWidth: layerRect.width,
            displayHeight: layerRect.height,
            overlayWidth: overlayRect.width,
            overlayHeight: overlayRect.height,
          })
        }
      }
    },
    [canDragX, canDragY],
  )

  // Handle mouse/touch down on resize handles
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, handle: ResizeHandle) => {
      e.preventDefault()
      e.stopPropagation()

      // Get actual pixel position from DOM element
      if (layerBoxRef.current && overlayRef.current) {
        const layerRect = layerBoxRef.current.getBoundingClientRect()
        const overlayRect = overlayRef.current.getBoundingClientRect()

        setIsResizing(true)
        setActiveHandle(handle)
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setDragStart({ x: clientX, y: clientY })
        setInitialState({
          displayX: layerRect.left - overlayRect.left,
          displayY: layerRect.top - overlayRect.top,
          displayWidth: layerRect.width,
          displayHeight: layerRect.height,
          overlayWidth: overlayRect.width,
          overlayHeight: overlayRect.height,
        })
      }
    },
    [],
  )

  // Handle mouse/touch move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      if (isDragging) {
        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y

        // Apply delta only to draggable axes
        // No clamping - allow dragging beyond boundaries
        const newDisplayX = canDragX ? initialState.displayX + deltaX : initialState.displayX
        const newDisplayY = canDragY ? initialState.displayY + deltaY : initialState.displayY

        // Apply snapping, center-alignment override, and position conversion
        const disableSnapping = e.metaKey || e.ctrlKey
        const updates = buildDragUpdates(
          newDisplayX,
          newDisplayY,
          initialState.displayWidth,
          initialState.displayHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
          canDragX,
          canDragY,
          disableSnapping,
          baseImageWidth,
          baseImageHeight,
          layerPaddingLeft,
          layerPaddingRight,
          layerPaddingTop,
          layerPaddingBottom,
          layerRotation,
          layerX,
          layerY,
          layerFillColor,
        )
        onLayerChange(updates)
      } else if (isResizing && activeHandle) {
        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y

        const disableSnapping = e.metaKey || e.ctrlKey
        const aspectRatio = layerWidth / layerHeight

        // resizeLayerWithCenterAwareness doubles the effective delta for any
        // center-aligned axis so the dragged edge tracks the pointer 1:1, then
        // re-centers the resulting box.
        const {
          left: newLeft,
          top: newTop,
          width: newWidth,
          height: newHeight,
        } = resizeLayerWithCenterAwareness(
          activeHandle,
          deltaX,
          deltaY,
          layerX === 'center',
          layerY === 'center',
          initialState.displayX,
          initialState.displayY,
          initialState.displayWidth,
          initialState.displayHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
          aspectRatio,
          lockedAspectRatio,
          disableSnapping,
        )

        const updates = convertDisplayToLayerPosition(
          newLeft,
          newTop,
          newWidth,
          newHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
          baseImageWidth,
          baseImageHeight,
          layerPaddingLeft,
          layerPaddingRight,
          layerPaddingTop,
          layerPaddingBottom,
          layerRotation,
          layerX,
          layerY,
          layerFillColor,
          true, // isResizing = true
        )
        onLayerChange(updates)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setActiveHandle(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleMouseMove)
      document.addEventListener('touchend', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleMouseMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [
    isDragging,
    isResizing,
    activeHandle,
    dragStart,
    initialState,
    canDragX,
    canDragY,
    onLayerChange,
    lockedAspectRatio,
    layerWidth,
    layerHeight,
    baseImageWidth,
    baseImageHeight,
    layerPaddingLeft,
    layerPaddingRight,
    layerPaddingTop,
    layerPaddingBottom,
    layerRotation,
    layerX,
    layerY,
    layerFillColor,
  ])

  // Handle mousedown outside layer box to deselect
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if mousedown directly on overlay background (not layer box or handles)
      if (e.target === overlayRef.current && onDeselect) {
        onDeselect()
      }
    },
    [onDeselect],
  )

  // Handle double-click on layer box to enter edit mode
  const handleLayerDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('layer-box') && onEnterEditMode) {
        e.preventDefault()
        e.stopPropagation()
        onEnterEditMode()
      }
    },
    [onEnterEditMode],
  )

  return (
    <div
      ref={overlayRef}
      className='pointer-events-auto absolute inset-0 z-20 h-full w-full'
      onMouseDown={handleOverlayMouseDown}
    >
      {/* Layer box and handles */}
      <div
        ref={layerBoxRef}
        className={cn(
          'layer-box pointer-events-auto absolute cursor-move border border-white',
          (isDragging || isResizing) && 'cursor-grabbing',
        )}
        style={{
          left: leftPercent,
          top: topPercent,
          width: widthPercent,
          height: heightPercent,
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.5)',
        }}
        onMouseDown={handleLayerMouseDown}
        onTouchStart={handleLayerMouseDown}
        onDoubleClick={handleLayerDoubleClick}
      >
        {/* NO grid lines - as requested */}

        {/* Resize handles */}
        {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
          <div
            key={handle}
            className={cn(
              'absolute flex items-center justify-center',
              'h-11 w-11',
              handle === 'nw' && '-top-5.5 -left-5.5 cursor-nw-resize',
              handle === 'n' && '-top-5.5 left-1/2 -translate-x-1/2 cursor-n-resize',
              handle === 'ne' && '-top-5.5 -right-5.5 cursor-ne-resize',
              handle === 'e' && 'top-1/2 -right-5.5 -translate-y-1/2 cursor-e-resize',
              handle === 'se' && '-right-5.5 -bottom-5.5 cursor-se-resize',
              handle === 's' && '-bottom-5.5 left-1/2 -translate-x-1/2 cursor-s-resize',
              handle === 'sw' && '-bottom-5.5 -left-5.5 cursor-sw-resize',
              handle === 'w' && 'top-1/2 -left-5.5 -translate-y-1/2 cursor-w-resize',
            )}
            onMouseDown={(e) => handleResizeMouseDown(e, handle as ResizeHandle)}
            onTouchStart={(e) => handleResizeMouseDown(e, handle as ResizeHandle)}
          >
            {/* Visual handle: Photoshop-style white square with black border */}
            <div
              className='h-2 w-2 border border-black bg-white'
              style={{ boxShadow: '0 0 0 1px white' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
