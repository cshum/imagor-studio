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

/**
 * Calculate effective zoom levels by filtering out levels too close to the fit scale.
 * Only returns levels significantly larger than fit (with minimum 15% distance).
 *
 * @param fitScale - The current fit scale (0-1)
 * @returns Array of effective zoom levels including 'fit' and larger numeric levels
 */
function getEffectiveZoomLevels(fitScale: number): Array<number | 'fit'> {
  const baseLevels = [0.25, 0.5, 0.75, 1.0]

  // Filter to only keep levels significantly larger than fit (15% minimum distance)
  const MIN_DISTANCE = 0.15
  const largerLevels = baseLevels.filter((level) => level > fitScale + MIN_DISTANCE)

  // Effective levels: fit + larger levels
  return ['fit', ...largerLevels]
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

  const handleZoomIn = () => {
    if (!canZoomIn) return
    // Go to next level in effective levels array
    onZoomChange(effectiveLevels[currentIndex + 1])
  }

  const handleZoomOut = () => {
    if (!canZoomOut) return
    // Go to previous level in effective levels array
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
