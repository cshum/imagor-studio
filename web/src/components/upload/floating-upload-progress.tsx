import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, ChevronDown, ChevronUp, RotateCcw, Upload, X, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DragDropFile } from '@/hooks/use-drag-drop'

export interface FloatingUploadProgressProps {
  files: DragDropFile[]
  isUploading: boolean
  onRemoveFile?: (id: string) => void
  onCancelFile?: (id: string) => void
  onRetryFile?: (id: string) => Promise<void>
  onClearAll?: () => void
  onSuccess?: (count: number) => Promise<void>
}

export function FloatingUploadProgress({
  files,
  isUploading,
  onRemoveFile,
  onCancelFile,
  onRetryFile,
  onClearAll,
  onSuccess,
}: FloatingUploadProgressProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(true)
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null)

  const completedFiles = files.filter((f) => f.status === 'success').length
  const failedFiles = files.filter((f) => f.status === 'error').length
  const uploadingFiles = files.filter((f) => f.status === 'uploading').length

  const overallProgress =
    files.length > 0 ? files.reduce((acc, file) => acc + file.progress, 0) / files.length : 0

  const hasActiveUploads = uploadingFiles > 0
  const isComplete = completedFiles + failedFiles === files.length && files.length > 0
  const hasErrors = failedFiles > 0

  // Show popup when files are added
  useEffect(() => {
    if (files.length > 0) {
      setIsExpanded(true)
      // Clear any existing auto-hide timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer)
        setAutoHideTimer(null)
      }
    }
  }, [files.length])

  // Auto-hide after successful completion (no errors)
  useEffect(() => {
    if (isComplete && !hasErrors && !isUploading) {
      // Wait 3 seconds, call onSuccess (which handles invalidation + toast), then clear files
      const timer = setTimeout(async () => {
        if (onSuccess) {
          await onSuccess(completedFiles)
        }
        onClearAll?.()
      }, 3000)
      setAutoHideTimer(timer)

      return () => clearTimeout(timer)
    }
  }, [isComplete, hasErrors, isUploading, onClearAll, onSuccess, completedFiles])

  const getHeaderContent = () => {
    if (hasActiveUploads) {
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
    <Sheet open={files.length > 0} modal={false}>
      <SheetContent
        side="bottom"
        hideOverlay={true}
        hideClose={true}
        className="mx-auto max-w-2xl rounded-t-xl p-4"
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium">{title}</h3>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Collapse/Expand button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>

            {/* Clear/Close button */}
            {onClearAll && !isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClearAll()}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Overall progress bar - only show during active upload */}
        {hasActiveUploads && isExpanded && (
          <div className="mb-3">
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {/* Expanded file list */}
        {isExpanded && (
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative flex items-center gap-2 rounded-md bg-muted p-2 hover:bg-accent"
              >
                <FileStatusIcon status={file.status} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.file.name}</p>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>{formatFileSize(file.file.size)}</span>
                    {file.status === 'uploading' && <span>{Math.round(file.progress)}%</span>}
                    {file.error && (
                      <span className="text-destructive truncate">{file.error}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {file.status === 'uploading' && onCancelFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelFile(file.id)}
                      className="h-7 w-7 p-0"
                      title="Cancel upload"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {file.status === 'error' && onRetryFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRetryFile(file.id)}
                      className="h-7 w-7 p-0"
                      title="Retry upload"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}

                  {onRemoveFile &&
                    (file.status === 'success' ||
                      file.status === 'error' ||
                      file.status === 'cancelled') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveFile(file.id)}
                        className="h-7 w-7 p-0"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary stats when collapsed */}
        {!isExpanded && (
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              {uploadingFiles > 0 && (
                <span className="text-muted-foreground">
                  {t('pages.gallery.upload.progress.uploading', { count: uploadingFiles })}
                </span>
              )}
              {completedFiles > 0 && (
                <span className="text-muted-foreground">
                  {t('pages.gallery.upload.progress.completed', { count: completedFiles })}
                </span>
              )}
              {failedFiles > 0 && (
                <span className="text-destructive">
                  {t('pages.gallery.upload.progress.failed', { count: failedFiles })}
                </span>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function FileStatusIcon({ status }: { status: DragDropFile['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    case 'error':
      return <XCircle className="text-destructive h-4 w-4 flex-shrink-0" />
    case 'cancelled':
      return <XCircle className="text-muted-foreground h-4 w-4 flex-shrink-0" />
    case 'uploading':
    default:
      return <Upload className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
