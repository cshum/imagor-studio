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
  onCropChange: (crop: { left: number; top: number; width: number; height: number }) => void
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
  onCropChange,
}: CropOverlayProps) {
  // Calculate display coordinates (scaled for preview)
  const displayLeft = cropLeft * scale
  const displayTop = cropTop * scale
  const displayWidth = cropWidth * scale
  const displayHeight = cropHeight * scale
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

  // Handle mouse down on crop box (for dragging)
  const handleCropMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('crop-box')) {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        setInitialCrop({ left: displayLeft, top: displayTop, width: displayWidth, height: displayHeight })
      }
    },
    [displayLeft, displayTop, displayWidth, displayHeight],
  )

  // Handle mouse down on resize handles
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setActiveHandle(handle)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialCrop({ left: displayLeft, top: displayTop, width: displayWidth, height: displayHeight })
    },
    [displayLeft, displayTop, displayWidth, displayHeight],
  )

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y

        let newDisplayLeft = initialCrop.left + deltaX
        let newDisplayTop = initialCrop.top + deltaY

        // Constrain to preview bounds (in display coordinates)
        newDisplayLeft = Math.max(0, Math.min(newDisplayLeft, previewWidth - displayWidth))
        newDisplayTop = Math.max(0, Math.min(newDisplayTop, previewHeight - displayHeight))

        // Convert back to output coordinates
        onCropChange({
          left: Math.round(newDisplayLeft / scale),
          top: Math.round(newDisplayTop / scale),
          width: cropWidth,
          height: cropHeight,
        })
      } else if (isResizing && activeHandle) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y

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

        // Enforce minimum size (in display coordinates)
        const minSize = 20
        if (newWidth < minSize) {
          newWidth = minSize
          if (activeHandle?.includes('w')) {
            newLeft = initialCrop.left + initialCrop.width - minSize
          }
        }
        if (newHeight < minSize) {
          newHeight = minSize
          if (activeHandle?.includes('n')) {
            newTop = initialCrop.top + initialCrop.height - minSize
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

        // Convert back to output coordinates
        onCropChange({
          left: Math.round(newLeft / scale),
          top: Math.round(newTop / scale),
          width: Math.round(newWidth / scale),
          height: Math.round(newHeight / scale),
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
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
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
    scale,
    onCropChange,
  ])

  return (
    <div
      ref={overlayRef}
      className='pointer-events-none absolute inset-0'
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
            <rect x={displayLeft} y={displayTop} width={displayWidth} height={displayHeight} fill='black' />
          </mask>
        </defs>
        <rect width='100%' height='100%' fill='black' fillOpacity='0.5' mask='url(#crop-mask)' />
      </svg>

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
              'absolute h-3 w-3 rounded-full border-2 border-white bg-blue-500',
              handle === 'nw' && '-top-1.5 -left-1.5 cursor-nw-resize',
              handle === 'n' && '-top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize',
              handle === 'ne' && '-top-1.5 -right-1.5 cursor-ne-resize',
              handle === 'e' && 'top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize',
              handle === 'se' && '-right-1.5 -bottom-1.5 cursor-se-resize',
              handle === 's' && '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize',
              handle === 'sw' && '-bottom-1.5 -left-1.5 cursor-sw-resize',
              handle === 'w' && 'top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize',
            )}
            onMouseDown={(e) => handleResizeMouseDown(e, handle as ResizeHandle)}
          />
        ))}

        {/* Dimensions display */}
        <div className='pointer-events-none absolute -top-8 left-0 rounded bg-black/75 px-2 py-1 text-xs text-white'>
          {cropWidth} × {cropHeight}
        </div>
      </div>
    </div>
  )
}
