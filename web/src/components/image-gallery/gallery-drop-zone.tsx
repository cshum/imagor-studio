import React, { useCallback } from 'react'
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

  const handleUpload = useCallback(async () => {
    const results = await uploadFiles()
    
    // Wait a bit for state to update, then check results
    setTimeout(() => {
      const currentFiles = files
      const successfulFiles = currentFiles.filter((f) => f.status === 'success')
      const failedFiles = currentFiles.filter((f) => f.status === 'error')
      
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
      } else if (failedFiles.length > 0) {
        // All files failed
        toast.error(`Failed to upload ${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''}`)
      }
    }, 100)
  }, [uploadFiles, files, handleUploadComplete, clearFiles])

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (fileList) {
        const filesArray = Array.from(fileList)
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
  const router = useRouter()

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
