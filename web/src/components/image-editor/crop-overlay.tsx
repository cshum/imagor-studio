import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface CropOverlayProps {
  previewWidth: number
  previewHeight: number
  cropLeft: number
  cropTop: number
  cropWidth: number
  cropHeight: number
  scale: number
  scaleY?: number // Optional separate Y scale for stretch mode
  onCropChange: (crop: { left: number; top: number; width: number; height: number }) => void
  lockedAspectRatio?: number | null
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

export function CropOverlay({
  previewWidth,
  previewHeight,
  cropLeft,
  cropTop,
  cropWidth,
  cropHeight,
  scale,
  scaleY,
  onCropChange,
  lockedAspectRatio = null,
}: CropOverlayProps) {
  // Use separate scales for X and Y (for stretch mode support)
  const scaleX = scale
  const actualScaleY = scaleY ?? scale // Use scaleY if provided, otherwise use scale

  // Calculate display coordinates (scaled for preview)
  const displayLeft = cropLeft * scaleX
  const displayTop = cropTop * actualScaleY
  const displayWidth = cropWidth * scaleX
  const displayHeight = cropHeight * actualScaleY
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialCrop, setInitialCrop] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })

  // Handle mouse/touch down on crop box (for dragging)
  const handleCropMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ((e.target as HTMLElement).classList.contains('crop-box')) {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setDragStart({ x: clientX, y: clientY })
        setInitialCrop({
          left: displayLeft,
          top: displayTop,
          width: displayWidth,
          height: displayHeight,
        })
      }
    },
    [displayLeft, displayTop, displayWidth, displayHeight],
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
      setInitialCrop({
        left: displayLeft,
        top: displayTop,
        width: displayWidth,
        height: displayHeight,
      })
    },
    [displayLeft, displayTop, displayWidth, displayHeight],
  )

  // Handle mouse/touch move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      if (isDragging) {
        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y

        let newDisplayLeft = initialCrop.left + deltaX
        let newDisplayTop = initialCrop.top + deltaY

        // Constrain to preview bounds (in display coordinates)
        newDisplayLeft = Math.max(0, Math.min(newDisplayLeft, previewWidth - displayWidth))
        newDisplayTop = Math.max(0, Math.min(newDisplayTop, previewHeight - displayHeight))

        // Convert back to original coordinates using separate scales
        onCropChange({
          left: Math.round(newDisplayLeft / scaleX),
          top: Math.round(newDisplayTop / actualScaleY),
          width: cropWidth,
          height: cropHeight,
        })
      } else if (isResizing && activeHandle) {
        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y

        let newLeft = initialCrop.left
        let newTop = initialCrop.top
        let newWidth = initialCrop.width
        let newHeight = initialCrop.height

        // Handle different resize directions
        switch (activeHandle) {
          case 'nw':
            newLeft = initialCrop.left + deltaX
            newTop = initialCrop.top + deltaY
            newWidth = initialCrop.width - deltaX
            newHeight = initialCrop.height - deltaY
            break
          case 'n':
            newTop = initialCrop.top + deltaY
            newHeight = initialCrop.height - deltaY
            break
          case 'ne':
            newTop = initialCrop.top + deltaY
            newWidth = initialCrop.width + deltaX
            newHeight = initialCrop.height - deltaY
            break
          case 'e':
            newWidth = initialCrop.width + deltaX
            break
          case 'se':
            newWidth = initialCrop.width + deltaX
            newHeight = initialCrop.height + deltaY
            break
          case 's':
            newHeight = initialCrop.height + deltaY
            break
          case 'sw':
            newLeft = initialCrop.left + deltaX
            newWidth = initialCrop.width - deltaX
            newHeight = initialCrop.height + deltaY
            break
          case 'w':
            newLeft = initialCrop.left + deltaX
            newWidth = initialCrop.width - deltaX
            break
        }

        // Apply aspect ratio lock if set
        if (lockedAspectRatio) {
          // Determine which dimension to constrain based on the handle
          if (activeHandle === 'e' || activeHandle === 'w') {
            // Horizontal resize: adjust height to maintain ratio
            newHeight = newWidth / lockedAspectRatio
            if (activeHandle === 'w') {
              // Adjust top to keep bottom edge fixed
              newTop = initialCrop.top + initialCrop.height - newHeight
            }
          } else if (activeHandle === 'n' || activeHandle === 's') {
            // Vertical resize: adjust width to maintain ratio
            newWidth = newHeight * lockedAspectRatio
            if (activeHandle === 'n') {
              // Adjust left to keep right edge fixed
              newLeft = initialCrop.left + initialCrop.width - newWidth
            }
          } else {
            // Corner resize: maintain aspect ratio based on the larger delta
            const widthChange = Math.abs(newWidth - initialCrop.width)
            const heightChange = Math.abs(newHeight - initialCrop.height)

            if (widthChange > heightChange) {
              // Width changed more, adjust height
              newHeight = newWidth / lockedAspectRatio
            } else {
              // Height changed more, adjust width
              newWidth = newHeight * lockedAspectRatio
            }

            // Adjust position for top-left handles
            if (activeHandle?.includes('n')) {
              newTop = initialCrop.top + initialCrop.height - newHeight
            }
            if (activeHandle?.includes('w')) {
              newLeft = initialCrop.left + initialCrop.width - newWidth
            }
          }
        }

        // Enforce minimum size (in display coordinates)
        const minSize = 20
        if (newWidth < minSize) {
          newWidth = minSize
          if (lockedAspectRatio) {
            newHeight = newWidth / lockedAspectRatio
          }
          if (activeHandle?.includes('w')) {
            newLeft = initialCrop.left + initialCrop.width - minSize
          }
          if (activeHandle?.includes('n') && lockedAspectRatio) {
            newTop = initialCrop.top + initialCrop.height - newHeight
          }
        }
        if (newHeight < minSize) {
          newHeight = minSize
          if (lockedAspectRatio) {
            newWidth = newHeight * lockedAspectRatio
          }
          if (activeHandle?.includes('n')) {
            newTop = initialCrop.top + initialCrop.height - minSize
          }
          if (activeHandle?.includes('w') && lockedAspectRatio) {
            newLeft = initialCrop.left + initialCrop.width - newWidth
          }
        }

        // Constrain to preview bounds (in display coordinates)
        if (newLeft < 0) {
          newWidth += newLeft
          newLeft = 0
        }
        if (newTop < 0) {
          newHeight += newTop
          newTop = 0
        }
        if (newLeft + newWidth > previewWidth) {
          newWidth = previewWidth - newLeft
        }
        if (newTop + newHeight > previewHeight) {
          newHeight = previewHeight - newTop
        }

        // Convert back to original coordinates using separate scales
        onCropChange({
          left: Math.round(newLeft / scaleX),
          top: Math.round(newTop / actualScaleY),
          width: Math.round(newWidth / scaleX),
          height: Math.round(newHeight / actualScaleY),
        })
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
    initialCrop,
    previewWidth,
    previewHeight,
    displayWidth,
    displayHeight,
    cropWidth,
    cropHeight,
    scaleX,
    actualScaleY,
    onCropChange,
    lockedAspectRatio,
  ])

  return (
    <div
      ref={overlayRef}
      className='pointer-events-none absolute inset-0 z-20'
      style={{
        width: previewWidth,
        height: previewHeight,
      }}
    >
      {/* Darkened overlay outside crop area */}
      <svg className='absolute inset-0 h-full w-full'>
        <defs>
          <mask id='crop-mask'>
            <rect width='100%' height='100%' fill='white' />
            <rect
              x={displayLeft}
              y={displayTop}
              width={displayWidth}
              height={displayHeight}
              fill='black'
            />
          </mask>
        </defs>
        <rect width='100%' height='100%' fill='black' fillOpacity='0.5' mask='url(#crop-mask)' />
      </svg>

      {/* Crop box and handles */}
      {/* Crop box */}
      <div
        className={cn(
          'crop-box pointer-events-auto absolute cursor-move border-2 border-white',
          (isDragging || isResizing) && 'cursor-grabbing',
        )}
        style={{
          left: displayLeft,
          top: displayTop,
          width: displayWidth,
          height: displayHeight,
        }}
        onMouseDown={handleCropMouseDown}
        onTouchStart={handleCropMouseDown}
      >
        {/* Grid lines */}
        <div className='pointer-events-none absolute inset-0'>
          <div className='absolute top-0 left-1/3 h-full w-px bg-white/50' />
          <div className='absolute top-0 left-2/3 h-full w-px bg-white/50' />
          <div className='absolute top-1/3 left-0 h-px w-full bg-white/50' />
          <div className='absolute top-2/3 left-0 h-px w-full bg-white/50' />
        </div>

        {/* Resize handles */}
        {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
          <div
            key={handle}
            className={cn(
              'absolute flex items-center justify-center',
              // Touch-friendly size: 44px (h-11 w-11)
              'h-11 w-11',
              // Position the touch area
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
            {/* Visual handle: 12px */}
            <div className='h-3 w-3 rounded-full border-2 border-white bg-blue-500' />
          </div>
        ))}
      </div>
    </div>
  )
}
