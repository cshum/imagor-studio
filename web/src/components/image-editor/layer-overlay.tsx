import { useCallback, useEffect, useRef, useState } from 'react'

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
    let leftPercent: string
    let topPercent: string
    let canDragX: boolean
    let canDragY: boolean
    let isRightAligned = false
    let isBottomAligned = false

    // Calculate width/height as percentages relative to total canvas (including padding)
    // The overlay represents the entire preview image which includes padding
    const widthPercent = `${(layerWidth / baseImageWidth) * 100}%`
    const heightPercent = `${(layerHeight / baseImageHeight) * 100}%`

    // Handle X position (relative to content area, then offset by padding)
    if (layerX === 'left') {
      leftPercent = `${(paddingLeft / baseImageWidth) * 100}%`
      canDragX = true
    } else if (layerX === 'center') {
      const xPos = paddingLeft + (contentWidth - layerWidth) / 2
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
      canDragX = false
    } else if (layerX === 'right') {
      const xPos = paddingLeft + contentWidth - layerWidth
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
      isRightAligned = true
      canDragX = true
    } else if (typeof layerX === 'number') {
      if (layerX < 0) {
        // Negative: distance from right edge of canvas (including paddingRight)
        const xPos = baseImageWidth + layerX - layerWidth
        leftPercent = `${(xPos / baseImageWidth) * 100}%`
        isRightAligned = true
      } else {
        // Positive: absolute position on canvas (already includes padding offset)
        leftPercent = `${(layerX / baseImageWidth) * 100}%`
      }
      canDragX = true
    } else {
      leftPercent = `${(paddingLeft / baseImageWidth) * 100}%`
      canDragX = false
    }

    // Handle Y position (relative to content area, then offset by padding)
    if (layerY === 'top') {
      topPercent = `${(paddingTop / baseImageHeight) * 100}%`
      canDragY = true
    } else if (layerY === 'center') {
      const yPos = paddingTop + (contentHeight - layerHeight) / 2
      topPercent = `${(yPos / baseImageHeight) * 100}%`
      canDragY = false
    } else if (layerY === 'bottom') {
      const yPos = paddingTop + contentHeight - layerHeight
      topPercent = `${(yPos / baseImageHeight) * 100}%`
      isBottomAligned = true
      canDragY = true
    } else if (typeof layerY === 'number') {
      if (layerY < 0) {
        // Negative: distance from bottom edge of canvas (including paddingBottom)
        const yPos = baseImageHeight + layerY - layerHeight
        topPercent = `${(yPos / baseImageHeight) * 100}%`
        isBottomAligned = true
      } else {
        // Positive: absolute position on canvas (already includes padding offset)
        topPercent = `${(layerY / baseImageHeight) * 100}%`
      }
      canDragY = true
    } else {
      topPercent = `${(paddingTop / baseImageHeight) * 100}%`
      canDragY = false
    }

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

  // Convert display coordinates back to layer position
  const convertToLayerPosition = useCallback(
    (
      newDisplayX: number,
      newDisplayY: number,
      newDisplayWidth: number,
      newDisplayHeight: number,
      overlayWidth: number,
      overlayHeight: number,
    ) => {
      const updates: {
        x?: string | number
        y?: string | number
        transforms?: {
          width?: number
          height?: number
        }
      } = {}

      // Convert from preview pixels to content area dimensions
      // The overlay represents the entire canvas (content + padding)
      // The display size includes the layer's own padding, so we need to subtract it
      const widthPercent = newDisplayWidth / overlayWidth
      const heightPercent = newDisplayHeight / overlayHeight

      // Calculate total size on canvas (including base padding)
      const totalCanvasWidth = Math.round(widthPercent * baseImageWidth)
      const totalCanvasHeight = Math.round(heightPercent * baseImageHeight)

      // Subtract layer's own padding to get the actual image dimensions
      const layerImageWidth = totalCanvasWidth - layerPaddingLeft - layerPaddingRight
      const layerImageHeight = totalCanvasHeight - layerPaddingTop - layerPaddingBottom

      updates.transforms = {
        width: Math.max(1, layerImageWidth), // Ensure minimum of 1px
        height: Math.max(1, layerImageHeight),
      }

      // Convert X position with auto-switch on boundary crossing
      if (canDragX) {
        const xPercent = newDisplayX / overlayWidth
        const canvasX = Math.round(xPercent * baseImageWidth)
        // Use total layer width (image + layer padding) for position calculations
        const totalLayerWidth = totalCanvasWidth

        if (isRightAligned) {
          // Currently right-aligned (negative offset from canvas right edge)
          const calculatedOffset = canvasX + totalLayerWidth - baseImageWidth

          if (calculatedOffset > 0) {
            // Crossed boundary to positive - switch to left-aligned
            // Convert to content-relative position
            updates.x = canvasX - paddingLeft
          } else if (calculatedOffset === 0) {
            // Exactly at right edge - use "right" string for imagor
            updates.x = 'right'
          } else {
            // Stay right-aligned (negative offset from canvas right)
            updates.x = calculatedOffset
          }
        } else {
          // Currently left-aligned (positive offset from content left edge)
          const contentX = canvasX - paddingLeft
          
          if (contentX < 0) {
            // Crossed boundary to negative - switch to right-aligned
            // Calculate offset from canvas right
            updates.x = canvasX + totalLayerWidth - baseImageWidth
          } else {
            // Stay left-aligned (positive offset from content left)
            updates.x = contentX
          }
        }
      }

      // Convert Y position with auto-switch on boundary crossing
      if (canDragY) {
        const yPercent = newDisplayY / overlayHeight
        const canvasY = Math.round(yPercent * baseImageHeight)
        // Use total layer height (image + layer padding) for position calculations
        const totalLayerHeight = totalCanvasHeight

        if (isBottomAligned) {
          // Currently bottom-aligned (negative offset from canvas bottom)
          const calculatedOffset = canvasY + totalLayerHeight - baseImageHeight

          if (calculatedOffset > 0) {
            // Crossed boundary to positive - switch to top-aligned
            // Convert to content-relative position
            updates.y = canvasY - paddingTop
          } else if (calculatedOffset === 0) {
            // Exactly at bottom edge - use "bottom" string for imagor
            updates.y = 'bottom'
          } else {
            // Stay bottom-aligned (negative offset from canvas bottom)
            updates.y = calculatedOffset
          }
        } else {
          // Currently top-aligned (positive offset from top edge of content)
          const contentY = canvasY - paddingTop

          if (contentY < 0) {
            // Crossed boundary to negative - switch to bottom-aligned
            // Calculate offset from canvas bottom
            updates.y = canvasY + totalLayerHeight - baseImageHeight
          } else {
            // Stay top-aligned (positive offset from content top)
            updates.y = contentY
          }
        }
      }

      return updates
    },
    [
      contentWidth,
      contentHeight,
      paddingLeft,
      paddingTop,
      baseImageWidth,
      baseImageHeight,
      layerPaddingLeft,
      layerPaddingRight,
      layerPaddingTop,
      layerPaddingBottom,
      canDragX,
      canDragY,
      isRightAligned,
      isBottomAligned,
    ],
  )

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

        const updates = convertToLayerPosition(
          newDisplayX,
          newDisplayY,
          initialState.displayWidth,
          initialState.displayHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
        )
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

        const updates = convertToLayerPosition(
          newLeft,
          newTop,
          newWidth,
          newHeight,
          initialState.overlayWidth,
          initialState.overlayHeight,
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
    convertToLayerPosition,
    onLayerChange,
    lockedAspectRatio,
    layerWidth,
    layerHeight,
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
          'layer-box pointer-events-auto absolute cursor-move border-2 border-white',
          (isDragging || isResizing) && 'cursor-grabbing',
        )}
        style={{
          left: leftPercent,
          top: topPercent,
          width: widthPercent,
          height: heightPercent,
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
            <div className='h-3 w-3 rounded-full border-2 border-white bg-blue-500' />
          </div>
        ))}
      </div>
    </div>
  )
}
