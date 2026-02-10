import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface LayerOverlayProps {
  previewWidth: number
  previewHeight: number
  layerX: string | number
  layerY: string | number
  layerWidth: number
  layerHeight: number
  scale: number
  scaleY?: number
  onLayerChange: (updates: {
    x?: string | number
    y?: string | number
    width?: number
    height?: number
  }) => void
  lockedAspectRatio: boolean
  baseImageWidth: number
  baseImageHeight: number
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

export function LayerOverlay({
  previewWidth,
  previewHeight,
  layerX,
  layerY,
  layerWidth,
  layerHeight,
  scale,
  scaleY,
  onLayerChange,
  lockedAspectRatio,
  baseImageWidth,
  baseImageHeight,
}: LayerOverlayProps) {
  const scaleX = scale
  const actualScaleY = scaleY ?? scale

  // Calculate display position and drag constraints
  const getDisplayPosition = useCallback(() => {
    let displayX: number
    let displayY: number
    let canDragX: boolean
    let canDragY: boolean
    let isRightAligned = false
    let isBottomAligned = false

    // Handle X position
    if (layerX === 'left') {
      displayX = 0
      canDragX = false
    } else if (layerX === 'center') {
      displayX = ((baseImageWidth - layerWidth) / 2) * scaleX
      canDragX = false
    } else if (layerX === 'right') {
      displayX = (baseImageWidth - layerWidth) * scaleX
      canDragX = false
    } else if (typeof layerX === 'number') {
      if (layerX < 0) {
        // Negative: distance from right edge to layer's RIGHT edge
        // Position layer's LEFT edge so its RIGHT edge is |layerX| pixels from right edge
        displayX = (baseImageWidth + layerX - layerWidth) * scaleX
        isRightAligned = true
      } else {
        // Positive: from left edge
        displayX = layerX * scaleX
      }
      canDragX = true
    } else {
      displayX = 0
      canDragX = false
    }

    // Handle Y position
    if (layerY === 'top') {
      displayY = 0
      canDragY = false
    } else if (layerY === 'center') {
      displayY = ((baseImageHeight - layerHeight) / 2) * actualScaleY
      canDragY = false
    } else if (layerY === 'bottom') {
      displayY = (baseImageHeight - layerHeight) * actualScaleY
      canDragY = false
    } else if (typeof layerY === 'number') {
      if (layerY < 0) {
        // Negative: distance from bottom edge to layer's BOTTOM edge
        // Position layer's TOP edge so its BOTTOM edge is |layerY| pixels from bottom edge
        displayY = (baseImageHeight + layerY - layerHeight) * actualScaleY
        isBottomAligned = true
      } else {
        // Positive: from top edge
        displayY = layerY * actualScaleY
      }
      canDragY = true
    } else {
      displayY = 0
      canDragY = false
    }

    return { displayX, displayY, canDragX, canDragY, isRightAligned, isBottomAligned }
  }, [
    layerX,
    layerY,
    layerWidth,
    layerHeight,
    baseImageWidth,
    baseImageHeight,
    scaleX,
    actualScaleY,
  ])

  const { displayX, displayY, canDragX, canDragY, isRightAligned, isBottomAligned } =
    getDisplayPosition()

  const displayWidth = layerWidth * scaleX
  const displayHeight = layerHeight * actualScaleY

  const overlayRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialState, setInitialState] = useState({
    displayX: 0,
    displayY: 0,
    displayWidth: 0,
    displayHeight: 0,
  })

  // Convert display coordinates back to layer position
  const convertToLayerPosition = useCallback(
    (
      newDisplayX: number,
      newDisplayY: number,
      newDisplayWidth: number,
      newDisplayHeight: number,
    ) => {
      const updates: {
        x?: string | number
        y?: string | number
        width?: number
        height?: number
      } = {}

      // Convert width/height
      updates.width = Math.round(newDisplayWidth / scaleX)
      updates.height = Math.round(newDisplayHeight / actualScaleY)

      // Convert X position with auto-switch on boundary crossing
      if (canDragX) {
        const originalX = Math.round(newDisplayX / scaleX)
        
        if (isRightAligned) {
          // Currently right-aligned (negative offset)
          const calculatedOffset = originalX + updates.width - baseImageWidth
          
          if (calculatedOffset >= 0) {
            // Crossed boundary to positive - switch to left-aligned
            updates.x = calculatedOffset
          } else {
            // Stay right-aligned (negative offset)
            updates.x = calculatedOffset
          }
        } else {
          // Currently left-aligned (positive offset)
          if (originalX < 0) {
            // Crossed boundary to negative - switch to right-aligned
            updates.x = originalX + updates.width - baseImageWidth
          } else {
            // Stay left-aligned (positive offset)
            updates.x = originalX
          }
        }
      }

      // Convert Y position with auto-switch on boundary crossing
      if (canDragY) {
        const originalY = Math.round(newDisplayY / actualScaleY)
        
        if (isBottomAligned) {
          // Currently bottom-aligned (negative offset)
          const calculatedOffset = originalY + updates.height - baseImageHeight
          
          if (calculatedOffset >= 0) {
            // Crossed boundary to positive - switch to top-aligned
            updates.y = calculatedOffset
          } else {
            // Stay bottom-aligned (negative offset)
            updates.y = calculatedOffset
          }
        } else {
          // Currently top-aligned (positive offset)
          if (originalY < 0) {
            // Crossed boundary to negative - switch to bottom-aligned
            updates.y = originalY + updates.height - baseImageHeight
          } else {
            // Stay top-aligned (positive offset)
            updates.y = originalY
          }
        }
      }

      return updates
    },
    [
      scaleX,
      actualScaleY,
      canDragX,
      canDragY,
      isRightAligned,
      isBottomAligned,
      baseImageWidth,
      baseImageHeight,
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

        setIsDragging(true)
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setDragStart({ x: clientX, y: clientY })
        setInitialState({
          displayX,
          displayY,
          displayWidth,
          displayHeight,
        })
      }
    },
    [displayX, displayY, displayWidth, displayHeight, canDragX, canDragY],
  )

  // Handle mouse/touch down on resize handles
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, handle: ResizeHandle) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setActiveHandle(handle)
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      setDragStart({ x: clientX, y: clientY })
      setInitialState({
        displayX,
        displayY,
        displayWidth,
        displayHeight,
      })
    },
    [displayX, displayY, displayWidth, displayHeight],
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
        if (canDragX) {
          newDisplayX = initialState.displayX + deltaX
          // No upper bound constraint - can go beyond edges
          if (!isRightAligned) {
            // Left-aligned: cannot go negative
            newDisplayX = Math.max(0, newDisplayX)
          }
          // Right-aligned: no constraint (can go beyond left edge)
        }

        if (canDragY) {
          newDisplayY = initialState.displayY + deltaY
          // No upper bound constraint - can go beyond edges
          if (!isBottomAligned) {
            // Top-aligned: cannot go negative
            newDisplayY = Math.max(0, newDisplayY)
          }
          // Bottom-aligned: no constraint (can go beyond top edge)
        }

        const updates = convertToLayerPosition(
          newDisplayX,
          newDisplayY,
          initialState.displayWidth,
          initialState.displayHeight,
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

        const updates = convertToLayerPosition(newLeft, newTop, newWidth, newHeight)
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

  // Determine cursor based on drag constraints
  const getCursor = () => {
    if (isDragging || isResizing) return 'cursor-grabbing'
    if (!canDragX && !canDragY) return 'cursor-not-allowed'
    if (!canDragX) return 'cursor-ns-resize'
    if (!canDragY) return 'cursor-ew-resize'
    return 'cursor-move'
  }

  return (
    <div
      ref={overlayRef}
      className='pointer-events-none absolute inset-0 z-20'
      style={{
        width: previewWidth,
        height: previewHeight,
      }}
    >
      {/* Layer box and handles */}
      <div
        className={cn(
          'layer-box pointer-events-auto absolute border-2 border-blue-500',
          getCursor(),
        )}
        style={{
          left: displayX,
          top: displayY,
          width: displayWidth,
          height: displayHeight,
        }}
        onMouseDown={handleLayerMouseDown}
        onTouchStart={handleLayerMouseDown}
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
