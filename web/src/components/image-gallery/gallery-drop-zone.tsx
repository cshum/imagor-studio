import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { uploadFile } from '@/api/storage-api'
import { DropZone, DropZoneOverlay } from '@/components/upload/drop-zone'
import { UploadProgress } from '@/components/upload/upload-progress'
import { useDragDrop } from '@/hooks/use-drag-drop'
import { useAuth } from '@/stores/auth-store'

export interface GalleryDropZoneProps {
  currentPath: string
  isEmpty?: boolean
  className?: string
  children?: React.ReactNode
  width?: number
  maxFileCardWidth?: number
}

export function GalleryDropZone({
  currentPath,
  isEmpty = false,
  className,
  children,
  width = 800,
  maxFileCardWidth = 280,
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
    currentPath,
    acceptedTypes: ['image/*', 'video/*'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20,
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
          setTimeout(() => {
            clearFiles()
          }, 2000)
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

  // Check if user has write permissions
  const canUpload = authState.state === 'authenticated'

  if (!canUpload) {
    return <>{children}</>
  }

  return (
    <div {...dragProps} className={className}>
      {/* Full-screen overlay when dragging */}
      <DropZoneOverlay isDragActive={isDragActive} />

      {/* Unified Upload Component */}
      {files.length > 0 && (
        <div className='mb-4'>
          <UploadProgress
            files={files}
            isUploading={isUploading}
            onUpload={handleUpload}
            onRemoveFile={removeFile}
            onRetryFile={retryFile}
            onClearAll={clearFiles}
            width={width}
            maxFileCardWidth={maxFileCardWidth}
          />
        </div>
      )}

      {/* Drop zone for empty gallery */}
      {isEmpty ? (
        <DropZone
          isDragActive={isDragActive}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          className='min-h-[300px]'
        />
      ) : (
        children
      )}
    </div>
  )
}
