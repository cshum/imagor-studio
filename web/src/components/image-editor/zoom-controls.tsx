import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ZoomControlsProps {
  zoom: number | 'fit'
  onZoomChange: (zoom: number | 'fit') => void
  actualScale?: number | null
  className?: string
}

const ZOOM_LEVELS: Array<number | 'fit'> = ['fit', 0.25, 0.5, 0.75, 1.0, 1.5, 2.0]

export function ZoomControls({ zoom, onZoomChange, actualScale, className }: ZoomControlsProps) {
  const { t } = useTranslation()

  // Preserve the last known actualScale during transitions
  // This ensures smart zoom logic works even when actualScale becomes null temporarily
  const previousActualScaleRef = useRef<number | null>(null)

  // Update ref whenever we have a valid actualScale
  useEffect(() => {
    if (actualScale !== null && actualScale !== undefined) {
      previousActualScaleRef.current = actualScale
    }
  }, [actualScale])

  const currentIndex = ZOOM_LEVELS.indexOf(zoom)
  const canZoomIn = currentIndex >= 0 && currentIndex < ZOOM_LEVELS.length - 1
  const canZoomOut = currentIndex > 0

  const handleZoomIn = () => {
    if (!canZoomIn) return

    // Smart zoom from Fit mode: jump to a substantial level
    if (zoom === 'fit') {
      // Use actualScale if available, fall back to previous scale, or default to 100%
      const scale = actualScale || previousActualScaleRef.current || 1.0

      // Find first level that's at least 1.5x the current scale (50% larger)
      const targetLevel = ZOOM_LEVELS.find((level) => level !== 'fit' && level > scale * 1.5)
      if (targetLevel) {
        onZoomChange(targetLevel)
        return
      }
      // Fallback to max zoom if no suitable level found
      onZoomChange(ZOOM_LEVELS[ZOOM_LEVELS.length - 1])
      return
    }

    // Normal zoom: go to next level
    onZoomChange(ZOOM_LEVELS[currentIndex + 1])
  }

  const handleZoomOut = () => {
    if (!canZoomOut) return

    // Smart zoom from Fit mode: jump to a substantial level
    if (zoom === 'fit') {
      // Use actualScale if available, fall back to previous scale, or default to 100%
      const scale = actualScale || previousActualScaleRef.current || 1.0

      // Find last level that's at most 0.67x the current scale (33% smaller)
      const targetLevel = [...ZOOM_LEVELS]
        .reverse()
        .find((level) => level !== 'fit' && level < scale * 0.67)
      if (targetLevel) {
        onZoomChange(targetLevel)
        return
      }
      // Fallback to minimum zoom (25%)
      onZoomChange(ZOOM_LEVELS[1])
      return
    }

    // Normal zoom: go to previous level
    onZoomChange(ZOOM_LEVELS[currentIndex - 1])
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
