import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon, Plus } from 'lucide-react'

import { FilePickerDialog } from '@/components/file-picker/file-picker-dialog'
import { Button } from '@/components/ui/button'
import type { ImageOverlay } from '@/lib/image-editor'
import { cn } from '@/lib/utils'

export interface OverlayTimelineProps {
  overlays: ImageOverlay[]
  selectedOverlayId?: string
  isBaseSelected: boolean
  onSelectBase: () => void
  onSelectOverlay: (overlayId: string) => void
  onAddOverlay: (imagePath: string) => void
  onToggleVisibility: (overlayId: string) => void
}

export function OverlayTimeline({
  overlays,
  selectedOverlayId,
  isBaseSelected,
  onSelectBase,
  onSelectOverlay,
  onAddOverlay,
}: OverlayTimelineProps) {
  const { t } = useTranslation()
  const [filePickerOpen, setFilePickerOpen] = useState(false)

  const handleOverlaySelect = (paths: string[]) => {
    if (paths.length > 0) {
      onAddOverlay(paths[0])
    }
  }

  return (
    <>
      <div className='bg-background border-t'>
        <div className='flex items-center gap-2 overflow-x-auto p-2'>
          {/* Base Image Card */}
          <button
            onClick={onSelectBase}
            className={cn(
              'flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded border-2 transition-colors',
              isBaseSelected
                ? 'border-primary bg-accent'
                : 'border-border hover:border-primary/50 hover:bg-accent/50',
            )}
          >
            <ImageIcon className='h-6 w-6' />
            <span className='text-xs font-medium'>{t('imageEditor.overlays.base')}</span>
          </button>

          {/* Overlay Cards */}
          {overlays.map((overlay) => (
            <button
              key={overlay.id}
              onClick={() => onSelectOverlay(overlay.id)}
              className={cn(
                'flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded border-2 transition-colors',
                selectedOverlayId === overlay.id
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50',
                !overlay.visible && 'opacity-50',
              )}
            >
              <ImageIcon className='h-6 w-6' />
              <span className='max-w-16 truncate text-xs' title={overlay.name}>
                {overlay.name || 'Overlay'}
              </span>
              <span className='text-muted-foreground text-xs'>{overlay.opacity || 100}%</span>
            </button>
          ))}

          {/* Add Overlay Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => setFilePickerOpen(true)}
            className='h-20 w-20 flex-shrink-0'
          >
            <div className='flex flex-col items-center gap-1'>
              <Plus className='h-6 w-6' />
              <span className='text-xs'>{t('imageEditor.overlays.add')}</span>
            </div>
          </Button>
        </div>
      </div>

      {/* File Picker Dialog */}
      <FilePickerDialog
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelect={handleOverlaySelect}
        selectionMode='single'
        fileType='images'
        title={t('imageEditor.overlays.selectOverlay')}
        description={t('imageEditor.overlays.selectOverlayDescription')}
        confirmButtonText={t('imageEditor.overlays.addOverlay')}
      />
    </>
  )
}
