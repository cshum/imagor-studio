import { CheckCircle, RotateCcw, Upload, X, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DragDropFile } from '@/hooks/use-drag-drop'
import { cn } from '@/lib/utils'

export interface UploadProgressProps {
  files: DragDropFile[]
  onRemoveFile?: (id: string) => void
  onRetryFile?: (id: string) => void
  onClearAll?: () => void
  className?: string
}

export function UploadProgress({
  files,
  onRemoveFile,
  onRetryFile,
  onClearAll,
  className,
}: UploadProgressProps) {
  if (files.length === 0) return null

  const completedFiles = files.filter((f) => f.status === 'success').length
  const failedFiles = files.filter((f) => f.status === 'error').length
  const uploadingFiles = files.filter((f) => f.status === 'uploading').length
  const pendingFiles = files.filter((f) => f.status === 'pending').length

  const overallProgress =
    files.length > 0 ? files.reduce((acc, file) => acc + file.progress, 0) / files.length : 0

  return (
    <div className={cn('bg-card rounded-lg border p-4 shadow-sm', className)}>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>Upload Progress</h3>
          <p className='text-muted-foreground text-sm'>
            {completedFiles} of {files.length} files completed
            {failedFiles > 0 && ` • ${failedFiles} failed`}
          </p>
        </div>
        {onClearAll && (
          <Button variant='ghost' size='sm' onClick={onClearAll} className='h-8 w-8 p-0'>
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>

      {/* Overall Progress */}
      <div className='mb-4'>
        <Progress value={overallProgress} className='h-2' />
      </div>

      {/* File List */}
      <div className='max-h-60 space-y-2 overflow-y-auto'>
        {files.map((file) => (
          <div
            key={file.id}
            className='flex items-center gap-3 rounded-md border p-3'
          >
              <FileStatusIcon status={file.status} />

              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{file.file.name}</p>
                <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                  <span>{formatFileSize(file.file.size)}</span>
                  {file.status === 'uploading' && <span>{Math.round(file.progress)}%</span>}
                  {file.error && <span className='text-destructive'>{file.error}</span>}
                </div>

                {file.status === 'uploading' && (
                  <Progress value={file.progress} className='mt-1 h-1' />
                )}
              </div>

              <div className='flex items-center gap-1'>
                {file.status === 'error' && onRetryFile && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onRetryFile(file.id)}
                    className='h-8 w-8 p-0'
                  >
                    <RotateCcw className='h-3 w-3' />
                  </Button>
                )}

                {onRemoveFile && file.status !== 'uploading' && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onRemoveFile(file.id)}
                    className='h-8 w-8 p-0'
                  >
                    <X className='h-3 w-3' />
                  </Button>
                )}
              </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      {(uploadingFiles > 0 || pendingFiles > 0 || failedFiles > 0) && (
        <div className='mt-4 border-t pt-4'>
          <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-4'>
              {uploadingFiles > 0 && (
                <span className='text-blue-600'>{uploadingFiles} uploading</span>
              )}
              {pendingFiles > 0 && (
                <span className='text-muted-foreground'>{pendingFiles} pending</span>
              )}
              {failedFiles > 0 && <span className='text-destructive'>{failedFiles} failed</span>}
            </div>

            {completedFiles > 0 && (
              <span className='text-green-600'>{completedFiles} completed</span>
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
  if (files.length === 0) return null

  const pendingFiles = files.filter((f) => f.status === 'pending')
  const hasFilesToUpload = pendingFiles.length > 0

  return (
    <div className={cn('bg-card flex items-center justify-between rounded-lg border p-4', className)}>
      <div>
        <p className='font-medium'>
          {files.length} file{files.length !== 1 ? 's' : ''} ready
        </p>
        <p className='text-muted-foreground text-sm'>
          {hasFilesToUpload ? `${pendingFiles.length} pending upload` : 'All files processed'}
        </p>
      </div>

      <div className='flex items-center gap-2'>
        {onClear && (
          <Button variant='outline' size='sm' onClick={onClear} disabled={isUploading}>
            Clear
          </Button>
        )}

        {onUpload && hasFilesToUpload && (
          <Button size='sm' onClick={onUpload} disabled={isUploading}>
            {isUploading
              ? 'Uploading...'
              : `Upload ${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
    </div>
  )
}
