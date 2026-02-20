import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getEffectiveZoomLevels } from '@/lib/zoom-utils'

interface ZoomControlsProps {
  zoom: number | 'fit'
  onZoomChange: (zoom: number | 'fit') => void
  actualScale?: number | null
  className?: string
}

export function ZoomControls({ zoom, onZoomChange, actualScale, className }: ZoomControlsProps) {
  const { t } = useTranslation()

  // Store the fit scale (only updates when in fit mode)
  const fitScaleRef = useRef<number | null>(null)

  // Update fit scale only when in fit mode
  useEffect(() => {
    if (zoom === 'fit' && actualScale !== null && actualScale !== undefined) {
      fitScaleRef.current = actualScale
    }
  }, [zoom, actualScale])

  // Calculate effective zoom levels
  // Use fitScaleRef if available, otherwise fall back to current actualScale
  // This ensures correct behavior on first load before fitScaleRef is set
  const fitScale = fitScaleRef.current || actualScale || 0
  const effectiveLevels = getEffectiveZoomLevels(fitScale)
  const currentIndex = effectiveLevels.indexOf(zoom)
  const canZoomIn = currentIndex >= 0 && currentIndex < effectiveLevels.length - 1
  const canZoomOut = currentIndex > 0

  // Keyboard shortcuts for zoom (Cmd/Ctrl + Plus/Minus/0/1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return

      if (e.key === '+' || e.key === '=') {
        // Zoom in
        e.preventDefault()
        if (canZoomIn) {
          onZoomChange(effectiveLevels[currentIndex + 1])
        }
        return
      }

      if (e.key === '-' || e.key === '_') {
        // Zoom out
        e.preventDefault()
        if (canZoomOut) {
          onZoomChange(effectiveLevels[currentIndex - 1])
        }
        return
      }

      if (e.key === '0') {
        // Fit to viewport
        e.preventDefault()
        onZoomChange('fit')
        return
      }

      if (e.key === '1') {
        // 100% zoom
        e.preventDefault()
        onZoomChange(1.0)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canZoomIn, canZoomOut, effectiveLevels, currentIndex, onZoomChange])

  const handleZoomIn = () => {
    if (!canZoomIn) return
    onZoomChange(effectiveLevels[currentIndex + 1])
  }

  const handleZoomOut = () => {
    if (!canZoomOut) return
    onZoomChange(effectiveLevels[currentIndex - 1])
  }

  const handleFit = () => {
    onZoomChange('fit')
  }

  // Display "Fit" when in fit mode, otherwise show target zoom percentage
  const displayText = zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`

  // Generate helpful tooltip for zoom button
  const zoomTooltip =
    zoom === 'fit'
      ? t('imageEditor.zoom.fit')
      : zoom === 1.0
        ? t('imageEditor.zoom.actualSize')
        : `${Math.round(zoom * 100)}%`

  return (
    <div
      className={cn(
        'bg-background/95 flex items-center gap-1 rounded-md border p-1 shadow-lg backdrop-blur-sm',
        className,
      )}
    >
      <Button
        variant='ghost'
        size='sm'
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        title={t('imageEditor.zoom.zoomOut')}
        className='h-7 w-7 p-0'
      >
        <Minus className='h-4 w-4' />
      </Button>

      <Button
        variant='ghost'
        size='sm'
        onClick={handleFit}
        disabled={zoom === 'fit'}
        title={zoomTooltip}
        className='text-muted-foreground hover:text-foreground h-7 min-w-[60px] px-2 font-mono text-xs'
      >
        {displayText}
      </Button>

      <Button
        variant='ghost'
        size='sm'
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        title={t('imageEditor.zoom.zoomIn')}
        className='h-7 w-7 p-0'
      >
        <Plus className='h-4 w-4' />
      </Button>
    </div>
  )
}
