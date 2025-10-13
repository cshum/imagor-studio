import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { uploadFile } from '@/api/storage-api'
import { DropZoneOverlay } from '@/components/upload/drop-zone-overlay.tsx'
import { DragDropFile, useDragDrop } from '@/hooks/use-drag-drop'
import { useAuth } from '@/stores/auth-store'

export interface GalleryDropZoneProps {
  currentPath: string
  existingFiles?: string[]
  imageExtensions?: string
  videoExtensions?: string
  className?: string
  children?: React.ReactNode
  onFileSelect?: (handler: (fileList: FileList | null) => void) => void
  onUploadStateChange?: (uploadState: {
    files: DragDropFile[]
    isUploading: boolean
    uploadFiles: () => Promise<void>
    removeFile: (id: string) => void
    retryFile: (id: string) => Promise<void>
    clearFiles: () => void
  }) => void
}

export function GalleryDropZone({
  currentPath,
  existingFiles = [],
  imageExtensions,
  videoExtensions,
  className,
  children,
  onFileSelect,
  onUploadStateChange,
}: GalleryDropZoneProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { authState } = useAuth()

  const handleFileUpload = useCallback(
    async (file: File, path: string): Promise<boolean> => {
      try {
        return await uploadFile(path, file)
      } catch (error) {
        console.error('Upload failed:', error)
        toast.error(t('pages.gallery.upload.messages.uploadFailed', { fileName: file.name }))
        return false
      }
    },
    [t],
  )

  const handleUploadComplete = useCallback(() => {
    // Refresh the gallery after successful uploads
    router.invalidate()
    toast.success(t('pages.gallery.upload.messages.uploadSuccess'))
  }, [router, t])

  const handleFilesDropped = useCallback(() => {
    // Scroll to top when files are dropped
    window.scrollTo({ top: 0 })
  }, [])

  const {
    isDragActive,
    files,
    dragProps,
    uploadFiles,
    removeFile,
    clearFiles,
    retryFile,
    isUploading,
  } = useDragDrop({
    onFileUpload: handleFileUpload,
    onFilesDropped: handleFilesDropped,
    existingFiles,
    currentPath,
    imageExtensions,
    videoExtensions,
  })

  const uploadCompletedRef = useRef(false)

  const handleUpload = useCallback(async () => {
    uploadCompletedRef.current = false
    await uploadFiles()
  }, [uploadFiles])

  // Watch for upload completion
  useEffect(() => {
    if (!isUploading && files.length > 0 && !uploadCompletedRef.current) {
      const successfulFiles = files.filter((f) => f.status === 'success')
      const failedFiles = files.filter((f) => f.status === 'error')
      const totalProcessed = successfulFiles.length + failedFiles.length
      const totalFiles = files.length

      // Only process results if all files have been processed
      if (totalProcessed === totalFiles) {
        uploadCompletedRef.current = true

        if (successfulFiles.length > 0 && failedFiles.length === 0) {
          // All files uploaded successfully
          handleUploadComplete()
          clearFiles()
        } else if (successfulFiles.length > 0 && failedFiles.length > 0) {
          // Some files succeeded, some failed
          toast.success(
            t('pages.gallery.upload.messages.uploadSuccessPartial', {
              count: successfulFiles.length,
            }),
          )
          toast.error(
            t('pages.gallery.upload.messages.uploadFailedPartial', { count: failedFiles.length }),
          )
          // Revalidate even with partial success to show uploaded files
          router.invalidate()
        } else if (failedFiles.length > 0) {
          // All files failed
          const message =
            failedFiles.length === 1
              ? t('pages.gallery.upload.messages.uploadFailedAll', { count: failedFiles.length })
              : t('pages.gallery.upload.messages.uploadFailedAllPlural', {
                  count: failedFiles.length,
                })
          toast.error(message)
        }
      }
    }
  }, [isUploading, files, handleUploadComplete, clearFiles, router, t])

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (fileList) {
        // The useDragDrop hook will handle adding these files
        dragProps.onDrop({
          preventDefault: () => {},
          stopPropagation: () => {},
          dataTransfer: { files: fileList },
        } as React.DragEvent)
      }
    },
    [dragProps],
  )

  // Expose file selection to parent component
  useEffect(() => {
    if (onFileSelect) {
      onFileSelect(handleFileSelect)
    }
  }, [onFileSelect, handleFileSelect])

  // Expose upload state to parent component
  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange({
        files,
        isUploading,
        uploadFiles: handleUpload,
        removeFile,
        retryFile,
        clearFiles,
      })
    }
  }, [files, isUploading, handleUpload, removeFile, retryFile, clearFiles, onUploadStateChange])

  // Check if user has write permissions
  const canUpload = authState.state === 'authenticated'

  if (!canUpload) {
    return <>{children}</>
  }

  return (
    <div {...dragProps} className={className}>
      {/* Full-screen overlay when dragging */}
      <DropZoneOverlay isDragActive={isDragActive} />
      {children}
    </div>
  )
}
