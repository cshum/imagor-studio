import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, ChevronDown, ChevronUp, RotateCcw, Upload, X, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DragDropFile } from '@/hooks/use-drag-drop'

export interface UploadProgressProps {
  files: DragDropFile[]
  isUploading: boolean
  onRemoveFile?: (id: string) => void
  onCancelFile?: (id: string) => void
  onRetryFile?: (id: string) => Promise<void>
  onClearAll?: () => void
  onSuccess?: (count: number) => Promise<void>
}

export function UploadProgress({
  files,
  isUploading,
  onRemoveFile,
  onCancelFile,
  onRetryFile,
  onClearAll,
  onSuccess,
}: UploadProgressProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<{
    isOpen: boolean
    isExpanded: boolean
    displayFiles: DragDropFile[]
    displayStats: {
      completed: number
      failed: number
      uploading: number
      progress: number
      isComplete: boolean
      hasErrors: boolean
      hasActiveUploads: boolean
    } | null
    isAutoClosing: boolean
  }>({
    isOpen: false,
    isExpanded: true,
    displayFiles: [],
    displayStats: null,
    isAutoClosing: false,
  })
  const autoCloseStartedRef = useRef(false)
  const manuallyClosedRef = useRef(false)
  const prevFilesRef = useRef<DragDropFile[]>([])
  const onSuccessRef = useRef(onSuccess)
  const onClearAllRef = useRef(onClearAll)
  const isOpenRef = useRef(state.isOpen)
  const isAutoClosingRef = useRef(state.isAutoClosing)

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onClearAllRef.current = onClearAll
  }, [onSuccess, onClearAll])

  useEffect(() => {
    isOpenRef.current = state.isOpen
    isAutoClosingRef.current = state.isAutoClosing
  }, [state.isOpen, state.isAutoClosing])

  const stats = useMemo(() => {
    const completed = files.filter((f) => f.status === 'success').length
    const failed = files.filter((f) => f.status === 'error').length
    const uploading = files.filter((f) => f.status === 'uploading').length
    const progress =
      files.length > 0 ? files.reduce((acc, file) => acc + file.progress, 0) / files.length : 0

    return {
      completed,
      failed,
      uploading,
      progress,
      isComplete: completed + failed === files.length && files.length > 0,
      hasErrors: failed > 0,
      hasActiveUploads: uploading > 0,
    }
  }, [files])

  // Handle sheet opening and auto-close logic
  useEffect(() => {
    // Close sheet when all files are removed (but not if auto-closing - let timeout handle it)
    if (files.length === 0 && isOpenRef.current && !isAutoClosingRef.current) {
      setState((s) => ({ ...s, isOpen: false, displayStats: null, isAutoClosing: false }))
      manuallyClosedRef.current = false
      autoCloseStartedRef.current = false
      return
    }

    // If new files are added during auto-close, cancel it and show new upload
    if (files.length > 0 && isAutoClosingRef.current) {
      autoCloseStartedRef.current = false
      setState((s) => ({
        ...s,
        isOpen: true,
        isExpanded: true,
        displayFiles: files,
        isAutoClosing: false,
        displayStats: null,
      }))
      return
    }

    // Open sheet when files are added (but not if manually closed or auto-close started)
    if (
      files.length > 0 &&
      !isOpenRef.current &&
      !autoCloseStartedRef.current &&
      !manuallyClosedRef.current
    ) {
      setState((s) => ({
        ...s,
        isOpen: true,
        isExpanded: true,
        displayFiles: files,
        isAutoClosing: false,
      }))
    }

    // Update display files while uploading (but not if auto-closing - use snapshot)
    if (files.length > 0 && !isAutoClosingRef.current && isOpenRef.current) {
      // Check if files actually changed by comparing with previous ref
      const filesChanged = prevFilesRef.current !== files
      if (filesChanged) {
        prevFilesRef.current = files
        setState((s) => ({ ...s, displayFiles: files }))
      }
    }

    // Auto-close after successful completion (no errors)
    if (
      stats.isComplete &&
      !stats.hasErrors &&
      !isUploading &&
      !autoCloseStartedRef.current &&
      isOpenRef.current
    ) {
      autoCloseStartedRef.current = true
      setState((s) => ({ ...s, isAutoClosing: true, displayFiles: files, displayStats: stats }))

      setTimeout(async () => {
        // Call onSuccess and wait for it to complete (use ref)
        if (onSuccessRef.current) {
          await onSuccessRef.current(stats.completed)
        }
        // Close the sheet
        setState((s) => ({ ...s, isOpen: false, isAutoClosing: false, displayStats: null }))
        // Reset flags for next upload
        autoCloseStartedRef.current = false
        manuallyClosedRef.current = false
        // Clear files (use ref)
        onClearAllRef.current?.()
      }, 3000)
    }
  }, [files, stats, isUploading])

  // Use snapshot stats if auto-closing, otherwise use live stats
  const activeStats = state.displayStats || stats

  const getHeaderContent = () => {
    if (activeStats.hasActiveUploads) {
      return {
        title: t('pages.gallery.upload.progress.uploadProgress'),
        subtitle: t('pages.gallery.upload.progress.filesCompleted', {
          completed: activeStats.completed,
          total: state.displayFiles.length,
        }),
      }
    } else if (activeStats.isComplete) {
      if (activeStats.failed === 0) {
        return {
          title: t('pages.gallery.upload.messages.uploadSuccess'),
          subtitle: t('pages.gallery.upload.progress.completed', { count: activeStats.completed }),
        }
      } else {
        return {
          title: t('pages.gallery.upload.summary.allFilesProcessed'),
          subtitle: `${activeStats.completed} successful${activeStats.failed > 0 ? `, ${activeStats.failed} failed` : ''}`,
        }
      }
    }
    return { title: '', subtitle: '' }
  }

  const { title, subtitle } = getHeaderContent()

  const handleClose = () => {
    setState((s) => ({ ...s, isOpen: false, isAutoClosing: false, displayStats: null }))
    manuallyClosedRef.current = true // Mark as manually closed to prevent immediate reopening
    onClearAll?.()

    // Reset after a short delay to allow next upload
    setTimeout(() => {
      manuallyClosedRef.current = false
    }, 100)
  }

  return (
    <Sheet open={state.isOpen} modal={false}>
      <SheetContent
        side='bottom'
        hideOverlay={true}
        hideClose={true}
        className='mx-auto max-w-2xl rounded-t-xl p-4'
      >
        {/* Accessible title for screen readers */}
        <SheetTitle className='sr-only'>{title}</SheetTitle>

        {/* Header */}
        <div className='mb-3 flex items-center justify-between'>
          <div className='flex-1'>
            <h3 className='font-medium'>{title}</h3>
            <p className='text-muted-foreground text-sm'>{subtitle}</p>
          </div>
          <div className='flex items-center gap-1'>
            {/* Collapse/Expand button */}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setState((s) => ({ ...s, isExpanded: !s.isExpanded }))}
              className='h-8 w-8 p-0'
            >
              {state.isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronUp className='h-4 w-4' />
              )}
            </Button>

            {/* Close button - only show if there are errors OR not auto-closing */}
            {onClearAll && !isUploading && (stats.hasErrors || !state.isAutoClosing) && (
              <Button variant='ghost' size='sm' onClick={handleClose} className='h-8 w-8 p-0'>
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>

        {/* Overall progress bar - only show during active upload */}
        {stats.hasActiveUploads && state.isExpanded && (
          <div className='mb-3'>
            <Progress value={stats.progress} className='h-2' />
          </div>
        )}

        {/* Expanded file list */}
        {state.isExpanded && (
          <div className='max-h-60 space-y-2 overflow-y-auto'>
            {state.displayFiles.map((file) => (
              <div
                key={file.id}
                className='bg-muted hover:bg-accent relative flex items-center gap-2 rounded-md p-2'
              >
                <FileStatusIcon status={file.status} />

                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{file.file.name}</p>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <span>{formatFileSize(file.file.size)}</span>
                    {file.status === 'uploading' && <span>{Math.round(file.progress)}%</span>}
                    {file.error && <span className='text-destructive truncate'>{file.error}</span>}
                  </div>
                </div>

                <div className='flex shrink-0 items-center gap-1'>
                  {file.status === 'uploading' && onCancelFile && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onCancelFile(file.id)}
                      className='h-7 w-7 p-0'
                      title='Cancel upload'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  )}

                  {file.status === 'error' && onRetryFile && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onRetryFile(file.id)}
                      className='h-7 w-7 p-0'
                      title='Retry upload'
                    >
                      <RotateCcw className='h-3 w-3' />
                    </Button>
                  )}

                  {onRemoveFile && (file.status === 'error' || file.status === 'cancelled') && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onRemoveFile(file.id)}
                      className='h-7 w-7 p-0'
                      title='Remove'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary stats when collapsed */}
        {!state.isExpanded && (
          <div className='space-y-2'>
            {/* Progress bar - only show during active upload */}
            {stats.hasActiveUploads && <Progress value={stats.progress} className='h-1.5' />}

            {/* Stats summary */}
            <div className='text-muted-foreground flex items-center gap-3 text-sm'>
              {stats.uploading > 0 && (
                <span className='text-muted-foreground'>
                  {t('pages.gallery.upload.progress.uploading', { count: stats.uploading })}
                </span>
              )}
              {stats.completed > 0 && (
                <span className='text-muted-foreground'>
                  {t('pages.gallery.upload.progress.completed', { count: stats.completed })}
                </span>
              )}
              {stats.failed > 0 && (
                <span className='text-destructive'>
                  {t('pages.gallery.upload.progress.failed', { count: stats.failed })}
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
      return <CheckCircle className='text-muted-foreground h-4 w-4 flex-shrink-0' />
    case 'error':
      return <XCircle className='text-destructive h-4 w-4 flex-shrink-0' />
    case 'cancelled':
      return <XCircle className='text-muted-foreground h-4 w-4 flex-shrink-0' />
    case 'uploading':
    default:
      return <Upload className='text-muted-foreground h-4 w-4 flex-shrink-0' />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
