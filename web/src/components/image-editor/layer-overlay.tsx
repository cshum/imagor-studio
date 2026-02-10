import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface LayerOverlayProps {
  previewWidth: number
  previewHeight: number
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
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

export function LayerOverlay({
  previewWidth,
  previewHeight,
  layerX,
  layerY,
  layerWidth,
  layerHeight,
  onLayerChange,
  lockedAspectRatio,
  baseImageWidth,
  baseImageHeight,
}: LayerOverlayProps) {
  // Calculate CSS percentage strings for position and size
  // This allows the browser to handle scaling automatically via CSS
  const getPercentageStyles = useCallback(() => {
    let leftPercent: string
    let topPercent: string
    let canDragX: boolean
    let canDragY: boolean
    let isRightAligned = false
    let isBottomAligned = false

    // Calculate width/height as percentages
    const widthPercent = `${(layerWidth / baseImageWidth) * 100}%`
    const heightPercent = `${(layerHeight / baseImageHeight) * 100}%`

    // Handle X position
    if (layerX === 'left') {
      leftPercent = '0%'
      canDragX = false
    } else if (layerX === 'center') {
      const xPos = (baseImageWidth - layerWidth) / 2
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
      canDragX = false
    } else if (layerX === 'right') {
      const xPos = baseImageWidth - layerWidth
      leftPercent = `${(xPos / baseImageWidth) * 100}%`
      isRightAligned = true
      canDragX = true
    } else if (typeof layerX === 'number') {
      if (layerX < 0) {
        // Negative: distance from right edge
        const xPos = baseImageWidth + layerX - layerWidth
        leftPercent = `${(xPos / baseImageWidth) * 100}%`
        isRightAligned = true
      } else {
        // Positive: from left edge
        leftPercent = `${(layerX / baseImageWidth) * 100}%`
      }
      canDragX = true
    } else {
      leftPercent = '0%'
      canDragX = false
    }

    // Handle Y position
    if (layerY === 'top') {
      topPercent = '0%'
      canDragY = false
    } else if (layerY === 'center') {
      const yPos = (baseImageHeight - layerHeight) / 2
      topPercent = `${(yPos / baseImageHeight) * 100}%`
      canDragY = false
    } else if (layerY === 'bottom') {
      const yPos = baseImageHeight - layerHeight
      topPercent = `${(yPos / baseImageHeight) * 100}%`
      isBottomAligned = true
      canDragY = true
    } else if (typeof layerY === 'number') {
      if (layerY < 0) {
        // Negative: distance from bottom edge
        const yPos = baseImageHeight + layerY - layerHeight
        topPercent = `${(yPos / baseImageHeight) * 100}%`
        isBottomAligned = true
      } else {
        // Positive: from top edge
        topPercent = `${(layerY / baseImageHeight) * 100}%`
      }
      canDragY = true
    } else {
      topPercent = '0%'
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
  }, [layerX, layerY, layerWidth, layerHeight, baseImageWidth, baseImageHeight])

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

      // Convert from preview pixels to base image pixels using percentages
      // Use actual overlay dimensions (not previewWidth/Height props which may be wrong)
      const widthPercent = newDisplayWidth / overlayWidth
      const heightPercent = newDisplayHeight / overlayHeight
      updates.transforms = {
        width: Math.round(widthPercent * baseImageWidth),
        height: Math.round(heightPercent * baseImageHeight),
      }

      // Convert X position with auto-switch on boundary crossing
      if (canDragX) {
        const xPercent = newDisplayX / overlayWidth
        const originalX = Math.round(xPercent * baseImageWidth)
        const layerWidth = updates.transforms?.width || 0

        if (isRightAligned) {
          // Currently right-aligned (negative offset from right edge)
          const calculatedOffset = originalX + layerWidth - baseImageWidth

          if (calculatedOffset > 0) {
            // Crossed boundary to positive - switch to left-aligned
            updates.x = calculatedOffset
          } else if (calculatedOffset === 0) {
            // Exactly at right edge - use "right" string for imagor
            updates.x = 'right'
          } else {
            // Stay right-aligned (negative offset)
            updates.x = calculatedOffset
          }
        } else {
          // Currently left-aligned (positive offset)
          if (originalX < 0) {
            // Crossed boundary to negative - switch to right-aligned
            updates.x = originalX + layerWidth - baseImageWidth
          } else {
            // Stay left-aligned (positive offset)
            updates.x = originalX
          }
        }
      }

      // Convert Y position with auto-switch on boundary crossing
      if (canDragY) {
        const yPercent = newDisplayY / overlayHeight
        const originalY = Math.round(yPercent * baseImageHeight)
        const layerHeight = updates.transforms?.height || 0

        if (isBottomAligned) {
          // Currently bottom-aligned (negative offset from bottom edge)
          const calculatedOffset = originalY + layerHeight - baseImageHeight

          if (calculatedOffset > 0) {
            // Crossed boundary to positive - switch to top-aligned
            updates.y = calculatedOffset
          } else if (calculatedOffset === 0) {
            // Exactly at bottom edge - use "bottom" string for imagor
            updates.y = 'bottom'
          } else {
            // Stay bottom-aligned (negative offset)
            updates.y = calculatedOffset
          }
        } else {
          // Currently top-aligned (positive offset)
          if (originalY < 0) {
            // Crossed boundary to negative - switch to bottom-aligned
            updates.y = originalY + layerHeight - baseImageHeight
          } else {
            // Stay top-aligned (positive offset)
            updates.y = originalY
          }
        }
      }

      return updates
    },
    [
      previewWidth,
      previewHeight,
      baseImageWidth,
      baseImageHeight,
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

  return (
    <div ref={overlayRef} className='pointer-events-none absolute inset-0 z-20 h-full w-full'>
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
