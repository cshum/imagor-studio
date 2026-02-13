import React, { useCallback, useEffect } from 'react'

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
    removeFile: (id: string) => void
    cancelFile: (id: string) => void
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
  const { authState } = useAuth()

  const handleFileUpload = useCallback(
    async (file: File, path: string, signal?: AbortSignal): Promise<boolean> => {
      try {
        return await uploadFile(path, file, signal)
      } catch {
        return false
      }
    },
    [],
  )

  const handleFilesDropped = useCallback(() => {
    // Scroll to top when files are dropped
    window.scrollTo({ top: 0 })
  }, [])

  const {
    isDragActive,
    files,
    dragProps,
    removeFile,
    cancelFile,
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
        removeFile,
        cancelFile,
        retryFile,
        clearFiles,
      })
    }
  }, [files, isUploading, removeFile, cancelFile, retryFile, clearFiles, onUploadStateChange])

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
