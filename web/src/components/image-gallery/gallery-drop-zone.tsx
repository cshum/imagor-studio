import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { uploadFile } from '@/api/storage-api'
import { DropZoneOverlay } from '@/components/upload/drop-zone-overlay.tsx'
import { DragDropFile, useDragDrop } from '@/hooks/use-drag-drop'
import { extractErrorMessage, hasErrorCode } from '@/lib/error-utils'
import { useAuth } from '@/stores/auth-store'

export interface GalleryDropZoneProps {
  currentPath: string
  existingFiles?: string[]
  imageExtensions?: string
  videoExtensions?: string
  className?: string
  children?: React.ReactNode
  spaceID?: string
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
  spaceID,
  onFileSelect,
  onUploadStateChange,
}: GalleryDropZoneProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()

  const mapUploadErrorMessage = useCallback(
    (file: File, error: unknown): string => {
      if (hasErrorCode(error, 'FILE_ALREADY_EXISTS')) {
        return t('pages.gallery.upload.messages.fileExists', { fileName: file.name })
      }

      const rawMessage = extractErrorMessage(error)
      if (/file too large for single upload/i.test(rawMessage)) {
        return t('pages.gallery.upload.messages.fileTooLarge', { fileName: file.name })
      }

      return t('pages.gallery.upload.messages.uploadFailed', { fileName: file.name })
    },
    [t],
  )

  const handleFileUpload = useCallback(
    async (
      file: File,
      path: string,
      signal?: AbortSignal,
      onProgress?: (progress: number) => void,
    ): Promise<boolean> => {
      try {
        return await uploadFile(path, file, { signal, spaceID, onProgress })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }

        throw new Error(mapUploadErrorMessage(file, error))
      }
    },
    [mapUploadErrorMessage, spaceID],
  )

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
