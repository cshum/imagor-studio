import { useTranslation } from 'react-i18next'
import { CheckCircle, RotateCcw, Upload, X, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DragDropFile } from '@/hooks/use-drag-drop'
import { cn } from '@/lib/utils'

export interface UploadProgressProps {
  files: DragDropFile[]
  isUploading: boolean
  onUpload?: () => void
  onRemoveFile?: (id: string) => void
  onRetryFile?: (id: string) => void
  onClearAll?: () => void
  className?: string
  width?: number
  maxFileCardWidth?: number
}

export interface UnifiedUploadProps {
  files: DragDropFile[]
  isUploading: boolean
  onUpload?: () => void
  onRemoveFile?: (id: string) => void
  onRetryFile?: (id: string) => void
  onClear?: () => void
  className?: string
  width?: number
  maxFileCardWidth?: number
}

export function UploadProgress({
  files,
  isUploading,
  onUpload,
  onRemoveFile,
  onRetryFile,
  onClearAll,
  className,
  width = 800,
  maxFileCardWidth = 280,
}: UploadProgressProps) {
  const { t } = useTranslation()

  if (files.length === 0) return null

  const completedFiles = files.filter((f) => f.status === 'success').length
  const failedFiles = files.filter((f) => f.status === 'error').length
  const uploadingFiles = files.filter((f) => f.status === 'uploading').length
  const pendingFiles = files.filter((f) => f.status === 'pending').length

  const overallProgress =
    files.length > 0 ? files.reduce((acc, file) => acc + file.progress, 0) / files.length : 0

  // Calculate grid layout similar to folder grid
  const columnCount = Math.max(2, Math.floor(width / maxFileCardWidth))

  // Determine current state
  const isAllPending = pendingFiles === files.length
  const hasActiveUploads = uploadingFiles > 0
  const isComplete = completedFiles + failedFiles === files.length && files.length > 0

  // Dynamic header content
  const getHeaderContent = () => {
    if (isAllPending) {
      return {
        title:
          files.length === 1
            ? t('pages.gallery.upload.summary.fileReady', { count: files.length })
            : t('pages.gallery.upload.summary.filesReady', { count: files.length }),
        subtitle: t('pages.gallery.upload.summary.pendingUpload', { count: pendingFiles }),
      }
    } else if (hasActiveUploads) {
      return {
        title: t('pages.gallery.upload.progress.uploadProgress'),
        subtitle: t('pages.gallery.upload.progress.filesCompleted', {
          completed: completedFiles,
          total: files.length,
        }),
      }
    } else if (isComplete) {
      if (failedFiles === 0) {
        return {
          title: t('pages.gallery.upload.messages.uploadSuccess'),
          subtitle: t('pages.gallery.upload.progress.completed', { count: completedFiles }),
        }
      } else {
        return {
          title: t('pages.gallery.upload.summary.allFilesProcessed'),
          subtitle: `${completedFiles} successful${failedFiles > 0 ? `, ${failedFiles} failed` : ''}`,
        }
      }
    }
    return { title: '', subtitle: '' }
  }

  const { title, subtitle } = getHeaderContent()

  return (
    <div className={cn('bg-card rounded-lg border p-4 shadow-sm', className)}>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>{title}</h3>
          <p className='text-muted-foreground text-sm'>{subtitle}</p>
        </div>
        <div className='flex items-center gap-2'>
          {onClearAll && (
            <Button variant='outline' size='sm' onClick={onClearAll} disabled={isUploading}>
              {t('pages.gallery.upload.summary.clear')}
            </Button>
          )}
          {onUpload && isAllPending && (
            <Button size='sm' onClick={onUpload} disabled={isUploading}>
              {isUploading
                ? t('pages.gallery.upload.summary.uploading')
                : pendingFiles === 1
                  ? t('pages.gallery.upload.summary.upload', { count: pendingFiles })
                  : t('pages.gallery.upload.summary.uploadFiles', { count: pendingFiles })}
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar - only show during active upload */}
      {hasActiveUploads && (
        <div className='mb-4'>
          <Progress value={overallProgress} className='h-2' />
        </div>
      )}

      {/* File Grid */}
      <div>
        <div
          className='grid gap-2'
          style={{
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          }}
        >
          {files.map((file) => (
            <Card key={file.id} className='hover-touch:bg-accent relative transition-colors'>
              <CardContent className='flex items-center px-4 py-4 sm:py-3'>
                <FileStatusIcon status={file.status} />

                <div className='ml-2 min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{file.file.name}</p>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <span>{formatFileSize(file.file.size)}</span>
                    {file.status === 'uploading' && <span>{Math.round(file.progress)}%</span>}
                    {file.error && <span className='text-destructive truncate'>{file.error}</span>}
                  </div>
                </div>

                <div className='ml-2 flex items-center gap-1'>
                  {file.status === 'error' && onRetryFile && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onRetryFile(file.id)}
                      className='h-6 w-6 p-0'
                    >
                      <RotateCcw className='h-3 w-3' />
                    </Button>
                  )}

                  {/* Only show individual remove button for failed files */}
                  {onRemoveFile && file.status === 'error' && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onRemoveFile(file.id)}
                      className='h-6 w-6 p-0'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  )}
                </div>
              </CardContent>

              {/* Upload progress overlay */}
              {file.status === 'uploading' && (
                <div className='absolute right-0 bottom-0 left-0'>
                  <Progress value={file.progress} className='h-1 rounded-none' />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {(uploadingFiles > 0 || pendingFiles > 0 || failedFiles > 0) && (
        <div className='mt-4 border-t pt-4'>
          <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-4'>
              {uploadingFiles > 0 && (
                <span className='text-blue-600'>
                  {t('pages.gallery.upload.progress.uploading', { count: uploadingFiles })}
                </span>
              )}
              {pendingFiles > 0 && (
                <span className='text-muted-foreground'>
                  {t('pages.gallery.upload.progress.pending', { count: pendingFiles })}
                </span>
              )}
              {failedFiles > 0 && (
                <span className='text-destructive'>
                  {t('pages.gallery.upload.progress.failed', { count: failedFiles })}
                </span>
              )}
            </div>

            {completedFiles > 0 && (
              <span className='text-green-600'>
                {t('pages.gallery.upload.progress.completed', { count: completedFiles })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FileStatusIcon({ status }: { status: DragDropFile['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle className='h-4 w-4 text-green-600' />
    case 'error':
      return <XCircle className='text-destructive h-4 w-4' />
    case 'uploading':
      return <Upload className='h-4 w-4 text-blue-600' />
    case 'pending':
    default:
      return <Upload className='text-muted-foreground h-4 w-4' />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export interface UploadSummaryProps {
  files: DragDropFile[]
  isUploading: boolean
  onUpload?: () => void
  onClear?: () => void
  className?: string
}

export function UploadSummary({
  files,
  isUploading,
  onUpload,
  onClear,
  className,
}: UploadSummaryProps) {
  const { t } = useTranslation()

  if (files.length === 0) return null

  const pendingFiles = files.filter((f) => f.status === 'pending')
  const hasFilesToUpload = pendingFiles.length > 0

  return (
    <div
      className={cn('bg-card flex items-center justify-between rounded-lg border p-4', className)}
    >
      <div>
        <p className='font-medium'>
          {files.length === 1
            ? t('pages.gallery.upload.summary.fileReady', { count: files.length })
            : t('pages.gallery.upload.summary.filesReady', { count: files.length })}
        </p>
        <p className='text-muted-foreground text-sm'>
          {hasFilesToUpload
            ? t('pages.gallery.upload.summary.pendingUpload', { count: pendingFiles.length })
            : t('pages.gallery.upload.summary.allFilesProcessed')}
        </p>
      </div>

      <div className='flex items-center gap-2'>
        {onClear && (
          <Button variant='outline' size='sm' onClick={onClear} disabled={isUploading}>
            {t('pages.gallery.upload.summary.clear')}
          </Button>
        )}

        {onUpload && hasFilesToUpload && (
          <Button size='sm' onClick={onUpload} disabled={isUploading}>
            {isUploading
              ? t('pages.gallery.upload.summary.uploading')
              : pendingFiles.length === 1
                ? t('pages.gallery.upload.summary.upload', { count: pendingFiles.length })
                : t('pages.gallery.upload.summary.uploadFiles', { count: pendingFiles.length })}
          </Button>
        )}
      </div>
    </div>
  )
}
