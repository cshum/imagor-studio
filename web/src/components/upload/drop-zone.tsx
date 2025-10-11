import React from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DropZoneProps {
  isDragActive: boolean
  isUploading?: boolean
  onFileSelect?: (files: FileList | null) => void
  className?: string
  children?: React.ReactNode
  disabled?: boolean
  acceptedTypes?: string[]
  maxFileSize?: number
  maxFiles?: number
}

export function DropZone({
  isDragActive,
  isUploading = false,
  onFileSelect,
  className,
  children,
  disabled = false,
  acceptedTypes = ['image/*', 'video/*'],
  maxFileSize = 50,
  maxFiles = 10,
}: DropZoneProps) {
  const { t } = useTranslation()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect?.(e.target.files)
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileTypes = () => {
    return acceptedTypes
      .map((type) => {
        if (type === 'image/*') return 'Images'
        if (type === 'video/*') return 'Videos'
        return type.replace('/', ' ').toUpperCase()
      })
      .join(', ')
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-all duration-200',
        isDragActive
          ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <input
        ref={fileInputRef}
        type='file'
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className='sr-only'
        disabled={disabled || isUploading}
      />

      {isDragActive && (
        <div className='bg-primary/10 absolute inset-0 z-10 flex items-center justify-center rounded-lg'>
          <div className='text-center'>
            <Upload className='text-primary mx-auto h-12 w-12' />
            <p className='text-primary mt-2 text-lg font-medium'>
              {t('pages.gallery.upload.dropZone.dropFilesHere')}
            </p>
          </div>
        </div>
      )}

      <div className='p-6 text-center'>
        {children || (
          <>
            <Upload className='text-muted-foreground mx-auto h-12 w-12' />
            <div className='mt-4'>
              <p className='text-lg font-medium'>
                {isUploading
                  ? t('pages.gallery.upload.dropZone.uploading')
                  : t('pages.gallery.upload.dropZone.dragAndDrop')}
              </p>
              <p className='text-muted-foreground mt-1 text-sm'>
                {t('pages.gallery.upload.dropZone.or')}{' '}
                <Button
                  variant='link'
                  className='h-auto p-0 text-sm'
                  onClick={handleBrowseClick}
                  disabled={disabled || isUploading}
                >
                  {t('pages.gallery.upload.dropZone.browseToChoose')}
                </Button>
              </p>
            </div>
            <div className='text-muted-foreground mt-4 text-xs'>
              <p>
                {t('pages.gallery.upload.dropZone.supportedFormats', {
                  formats: formatFileTypes(),
                })}
              </p>
              <p>
                {t('pages.gallery.upload.dropZone.maxFiles', { maxFiles, maxSize: maxFileSize })}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export interface DropZoneOverlayProps {
  isDragActive: boolean
  onClose?: () => void
}

export function DropZoneOverlay({ isDragActive, onClose }: DropZoneOverlayProps) {
  const { t } = useTranslation()

  if (!isDragActive) return null

  return (
    <div className='bg-background/80 fixed inset-0 z-50 flex items-center justify-center'>
      <div className='border-primary bg-card relative mx-4 max-w-md rounded-lg border-1 border-dashed p-8 text-center shadow-lg'>
        {onClose && (
          <Button
            variant='ghost'
            size='sm'
            className='absolute top-2 right-2 h-8 w-8 p-0'
            onClick={onClose}
          >
            <X className='h-4 w-4' />
          </Button>
        )}
        <Upload className='text-primary mx-auto h-16 w-16' />
        <h3 className='mt-4 text-xl font-semibold'>
          {t('pages.gallery.upload.dropZone.dropToUpload')}
        </h3>
        <p className='text-muted-foreground mt-2 text-sm'>
          {t('pages.gallery.upload.dropZone.releaseToAdd')}
        </p>
      </div>
    </div>
  )
}
