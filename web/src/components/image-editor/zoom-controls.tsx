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

  const currentIndex = ZOOM_LEVELS.indexOf(zoom)
  const canZoomIn = currentIndex >= 0 && currentIndex < ZOOM_LEVELS.length - 1
  const canZoomOut = currentIndex > 0

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomChange(ZOOM_LEVELS[currentIndex + 1])
    }
  }

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomChange(ZOOM_LEVELS[currentIndex - 1])
    }
  }

  const handleFit = () => {
    onZoomChange('fit')
  }

  // Display "Fit" when in fit mode, otherwise show zoom percentage
  // Only show actualScale percentage for explicit zoom levels (not fit mode)
  const displayText =
    zoom === 'fit'
      ? 'Fit'
      : actualScale
        ? `${Math.round(actualScale * 100)}%`
        : `${Math.round(zoom * 100)}%`

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
