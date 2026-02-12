import { useCallback, useEffect, useRef, useState } from 'react'

import { calculateLayerPosition, convertDisplayToLayerPosition } from '@/lib/layer-position'
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
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  layerPaddingLeft?: number
  layerPaddingRight?: number
  layerPaddingTop?: number
  layerPaddingBottom?: number
  layerRotation?: number
  layerFillColor?: string
  onDeselect?: () => void
  onEnterEditMode?: () => void
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

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
  paddingRight = 0,
  paddingTop = 0,
  paddingBottom = 0,
  layerPaddingLeft = 0,
  layerPaddingRight = 0,
  layerPaddingTop = 0,
  layerPaddingBottom = 0,
  layerRotation = 0,
  layerFillColor,
  onDeselect,
  onEnterEditMode,
}: LayerOverlayProps) {
  // Calculate content area dimensions (image without padding)
  // Layers are positioned relative to the content area, not the total canvas
  const contentWidth = baseImageWidth - paddingLeft - paddingRight
  const contentHeight = baseImageHeight - paddingTop - paddingBottom

  // Calculate CSS percentage strings for position and size
  // This allows the browser to handle scaling automatically via CSS
  const getPercentageStyles = useCallback(() => {
    // Use the utility function to calculate position
    const { leftPercent, topPercent } = calculateLayerPosition(
      layerX,
      layerY,
      layerWidth,
      layerHeight,
      baseImageWidth,
      baseImageHeight,
      paddingLeft,
      paddingTop,
    )

    // Calculate width/height as percentages relative to total canvas (including padding)
    // The overlay represents the entire preview image which includes padding
    const widthPercent = `${(layerWidth / baseImageWidth) * 100}%`
    const heightPercent = `${(layerHeight / baseImageHeight) * 100}%`

    // Determine drag capabilities and alignment
    const canDragX = layerX !== 'center' && typeof layerX !== 'undefined'
    const canDragY = layerY !== 'center' && typeof layerY !== 'undefined'
    const isRightAligned = layerX === 'right' || (typeof layerX === 'number' && layerX < 0)
    const isBottomAligned = layerY === 'bottom' || (typeof layerY === 'number' && layerY < 0)

    return {
      leftPercent,
      topPercent,
      widthPercent,
      heightPercent,
      canDragX,
      canDragY,
      isRightAligned,
      isBottomAligned,
    }
  }, [
    layerX,
    layerY,
    layerWidth,
    layerHeight,
    baseImageWidth,
    baseImageHeight,
    contentWidth,
    contentHeight,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
  ])

  const {
    leftPercent,
    topPercent,
    widthPercent,
    heightPercent,
    canDragX,
    canDragY,
    isRightAligned,
    isBottomAligned,
  } = getPercentageStyles()

  const overlayRef = useRef<HTMLDivElement>(null)
  const layerBoxRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null)
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

        let newDisplayX = initialState.displayX
        let newDisplayY = initialState.displayY

        // Apply delta only to draggable axes
        // No clamping - allow dragging beyond boundaries
        // convertToLayerPosition will auto-switch alignment when crossing edges
        if (canDragX) {
          newDisplayX = initialState.displayX + deltaX
        }

        if (canDragY) {
          newDisplayY = initialState.displayY + deltaY
        }

        const updates = convertDisplayToLayerPosition(
          newDisplayX,
          newDisplayY,
          initialState.displayWidth,
          initialState.displayHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
          baseImageWidth,
          baseImageHeight,
          paddingLeft,
          paddingTop,
          layerPaddingLeft,
          layerPaddingRight,
          layerPaddingTop,
          layerPaddingBottom,
          layerRotation,
          layerX,
          layerY,
          layerFillColor,
        )
        // During drag, only update position - don't recalculate dimensions
        // This prevents rounding errors from causing dimension changes
        delete updates.transforms
        onLayerChange(updates)
      } else if (isResizing && activeHandle) {
        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y

        let newLeft = initialState.displayX
        let newTop = initialState.displayY
        let newWidth = initialState.displayWidth
        let newHeight = initialState.displayHeight

        // Handle different resize directions
        switch (activeHandle) {
          case 'nw':
            newLeft = initialState.displayX + deltaX
            newTop = initialState.displayY + deltaY
            newWidth = initialState.displayWidth - deltaX
            newHeight = initialState.displayHeight - deltaY
            break
          case 'n':
            newTop = initialState.displayY + deltaY
            newHeight = initialState.displayHeight - deltaY
            break
          case 'ne':
            newTop = initialState.displayY + deltaY
            newWidth = initialState.displayWidth + deltaX
            newHeight = initialState.displayHeight - deltaY
            break
          case 'e':
            newWidth = initialState.displayWidth + deltaX
            break
          case 'se':
            newWidth = initialState.displayWidth + deltaX
            newHeight = initialState.displayHeight + deltaY
            break
          case 's':
            newHeight = initialState.displayHeight + deltaY
            break
          case 'sw':
            newLeft = initialState.displayX + deltaX
            newWidth = initialState.displayWidth - deltaX
            newHeight = initialState.displayHeight + deltaY
            break
          case 'w':
            newLeft = initialState.displayX + deltaX
            newWidth = initialState.displayWidth - deltaX
            break
        }

        // Apply aspect ratio lock if enabled
        if (lockedAspectRatio) {
          const aspectRatio = layerWidth / layerHeight

          if (activeHandle === 'e' || activeHandle === 'w') {
            // Horizontal resize: adjust height
            newHeight = newWidth / aspectRatio
            if (activeHandle === 'w') {
              newTop = initialState.displayY + initialState.displayHeight - newHeight
            }
          } else if (activeHandle === 'n' || activeHandle === 's') {
            // Vertical resize: adjust width
            newWidth = newHeight * aspectRatio
            if (activeHandle === 'n') {
              newLeft = initialState.displayX + initialState.displayWidth - newWidth
            }
          } else {
            // Corner resize: maintain aspect ratio
            const widthChange = Math.abs(newWidth - initialState.displayWidth)
            const heightChange = Math.abs(newHeight - initialState.displayHeight)

            if (widthChange > heightChange) {
              newHeight = newWidth / aspectRatio
            } else {
              newWidth = newHeight * aspectRatio
            }

            if (activeHandle?.includes('n')) {
              newTop = initialState.displayY + initialState.displayHeight - newHeight
            }
            if (activeHandle?.includes('w')) {
              newLeft = initialState.displayX + initialState.displayWidth - newWidth
            }
          }
        }

        // Enforce minimum size
        const minSize = 20
        if (newWidth < minSize) {
          newWidth = minSize
          if (lockedAspectRatio) {
            newHeight = newWidth / (layerWidth / layerHeight)
          }
          if (activeHandle?.includes('w')) {
            newLeft = initialState.displayX + initialState.displayWidth - minSize
          }
          if (activeHandle?.includes('n') && lockedAspectRatio) {
            newTop = initialState.displayY + initialState.displayHeight - newHeight
          }
        }
        if (newHeight < minSize) {
          newHeight = minSize
          if (lockedAspectRatio) {
            newWidth = newHeight * (layerWidth / layerHeight)
          }
          if (activeHandle?.includes('n')) {
            newTop = initialState.displayY + initialState.displayHeight - minSize
          }
          if (activeHandle?.includes('w') && lockedAspectRatio) {
            newLeft = initialState.displayX + initialState.displayWidth - newWidth
          }
        }

        const updates = convertDisplayToLayerPosition(
          newLeft,
          newTop,
          newWidth,
          newHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
          baseImageWidth,
          baseImageHeight,
          paddingLeft,
          paddingTop,
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
    isRightAligned,
    isBottomAligned,
    onLayerChange,
    lockedAspectRatio,
    layerWidth,
    layerHeight,
    baseImageWidth,
    baseImageHeight,
    paddingLeft,
    paddingTop,
    layerPaddingLeft,
    layerPaddingRight,
    layerPaddingTop,
    layerPaddingBottom,
    layerRotation,
    layerX,
    layerY,
  ])

  // Handle click outside layer box to deselect
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on overlay background (not layer box or handles)
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
      onClick={handleOverlayClick}
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
