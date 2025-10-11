import React, { useCallback, useEffect, useRef } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { uploadFile } from '@/api/storage-api'
import { DropZone, DropZoneOverlay } from '@/components/upload/drop-zone'
import { UploadProgress, UploadSummary } from '@/components/upload/upload-progress'
import { useDragDrop } from '@/hooks/use-drag-drop'
import { useAuth } from '@/stores/auth-store'

export interface GalleryDropZoneProps {
  currentPath: string
  isEmpty?: boolean
  className?: string
  children?: React.ReactNode
}

export function GalleryDropZone({
  currentPath,
  isEmpty = false,
  className,
  children,
}: GalleryDropZoneProps) {
  const router = useRouter()
  const { authState } = useAuth()

  const handleFileUpload = useCallback(async (file: File, path: string): Promise<boolean> => {
    try {
      const result = await uploadFile(path, file)
      return result
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(`Failed to upload ${file.name}`)
      return false
    }
  }, [])

  const handleFilesAdded = useCallback((files: File[]) => {
    toast.success(`Added ${files.length} file${files.length !== 1 ? 's' : ''} to upload queue`)
  }, [])

  const handleUploadComplete = useCallback(() => {
    // Refresh the gallery after successful uploads
    router.invalidate()
    toast.success('Files uploaded successfully!')
  }, [router])

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
    onFilesAdded: handleFilesAdded,
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
          toast.success(`${successfulFiles.length} files uploaded successfully`)
          toast.error(`${failedFiles.length} files failed to upload`)
          // Revalidate even with partial success to show uploaded files
          router.invalidate()
        } else if (failedFiles.length > 0) {
          // All files failed
          toast.error(
            `Failed to upload ${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''}`,
          )
        }
      }
    }
  }, [isUploading, files, handleUploadComplete, clearFiles, router])

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

      {/* Upload progress and summary */}
      {files.length > 0 && (
        <div className='mb-4 space-y-4'>
          <UploadSummary
            files={files}
            isUploading={isUploading}
            onUpload={handleUpload}
            onClear={clearFiles}
          />
          <UploadProgress
            files={files}
            onRemoveFile={removeFile}
            onRetryFile={retryFile}
            onClearAll={clearFiles}
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

export interface GalleryDropZoneWrapperProps {
  currentPath: string
  children: React.ReactNode
  className?: string
}

export function GalleryDropZoneWrapper({
  currentPath,
  children,
  className,
}: GalleryDropZoneWrapperProps) {
  const { authState } = useAuth()

  const handleFileUpload = useCallback(async (file: File, path: string): Promise<boolean> => {
    try {
      const result = await uploadFile(path, file)
      return result
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(`Failed to upload ${file.name}`)
      return false
    }
  }, [])

  const handleFilesAdded = useCallback((files: File[]) => {
    toast.success(`Added ${files.length} file${files.length !== 1 ? 's' : ''} to upload queue`)
  }, [])

  const { isDragActive, dragProps } = useDragDrop({
    onFilesAdded: handleFilesAdded,
    onFileUpload: handleFileUpload,
    currentPath,
    acceptedTypes: ['image/*', 'video/*'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20,
  })

  // Check if user has write permissions
  const canUpload = authState.state === 'authenticated'

  if (!canUpload) {
    return <div className={className}>{children}</div>
  }

  return (
    <div {...dragProps} className={className}>
      {/* Full-screen overlay when dragging */}
      <DropZoneOverlay isDragActive={isDragActive} />
      {children}
    </div>
  )
}
