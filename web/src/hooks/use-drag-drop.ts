import React, { useCallback, useRef, useState } from 'react'

import { isValidFileExtension } from '@/lib/file-extensions'
import { generateUniqueFilename } from '@/lib/file-utils'

export interface DragDropFile {
  file: File
  id: string
  status: 'uploading' | 'success' | 'error' | 'cancelled'
  progress: number
  error?: string
  abortController?: AbortController
}

export interface UseDragDropOptions {
  onFilesAdded?: (files: File[]) => void
  onFileUpload?: (file: File, path: string, signal?: AbortSignal) => Promise<boolean>
  onFilesDropped?: () => void
  existingFiles?: string[]
  imageExtensions?: string
  videoExtensions?: string
  currentPath?: string
}

export interface UseDragDropReturn {
  isDragActive: boolean
  files: DragDropFile[]
  dragProps: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  removeFile: (id: string) => void
  cancelFile: (id: string) => void
  clearFiles: () => void
  retryFile: (id: string) => Promise<void>
  isUploading: boolean
  uploadProgress: number
}

export function useDragDrop(options: UseDragDropOptions = {}): UseDragDropReturn {
  const {
    onFilesAdded,
    onFileUpload,
    onFilesDropped,
    existingFiles = [],
    imageExtensions = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif,.cr2',
    videoExtensions = '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg',
    currentPath = '',
  } = options

  const [isDragActive, setIsDragActive] = useState(false)
  const [files, setFiles] = useState<DragDropFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const dragCounter = useRef(0)

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file extension (more reliable than MIME type)
      if (!isValidFileExtension(file.name, imageExtensions, videoExtensions)) {
        return 'File type not supported.'
      }
      return null
    },
    [imageExtensions, videoExtensions],
  )

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles: DragDropFile[] = []
      const usedNames: string[] = []

      for (const file of newFiles) {
        const error = validateFile(file)
        if (error) {
          continue
        }

        // Check for duplicates in current upload queue
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size,
        )
        if (isDuplicate) {
          continue
        }

        // Generate unique filename to avoid conflicts
        const uniqueFileName = generateUniqueFilename(file.name, existingFiles, usedNames)
        usedNames.push(uniqueFileName)

        // Create a new File object with the unique name if it was renamed
        let fileToAdd = file
        if (uniqueFileName !== file.name) {
          fileToAdd = new File([file], uniqueFileName, { type: file.type })
        }

        const abortController = new AbortController()
        validFiles.push({
          file: fileToAdd,
          id: `${uniqueFileName}-${file.size}-${Date.now()}-${Math.random()}`,
          status: 'uploading', // Start as uploading instead of pending
          progress: 0,
          abortController,
        })
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles])
        onFilesAdded?.(validFiles.map((f) => f.file))
        // Auto-upload files immediately after adding them
        setTimeout(() => uploadFilesImmediate(validFiles), 0)
      }
    },
    [files, validateFile, onFilesAdded, existingFiles],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++

    // Ignore internal drags (items being moved within the gallery)
    const isInternalDrag = e.dataTransfer.types.includes('application/x-imagor-internal')
    if (!isInternalDrag && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--

    if (dragCounter.current === 0) {
      setIsDragActive(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Ignore internal drags
    const isInternalDrag = e.dataTransfer.types.includes('application/x-imagor-internal')
    if (isInternalDrag) {
      e.dataTransfer.dropEffect = 'none'
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      dragCounter.current = 0

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
        onFilesDropped?.()
      }
    },
    [addFiles, onFilesDropped],
  )

  // Internal function to upload specific files immediately
  const uploadFilesImmediate = useCallback(
    async (filesToUpload: DragDropFile[]) => {
      if (!onFileUpload) return

      setIsUploading(true)

      for (const fileItem of filesToUpload) {
        try {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id && f.status === 'uploading'
                  ? { ...f, progress: Math.min(f.progress + 10, 90) }
                  : f,
              ),
            )
          }, 100)

          const filePath = currentPath ? `${currentPath}/${fileItem.file.name}` : fileItem.file.name
          const success = await onFileUpload(
            fileItem.file,
            filePath,
            fileItem.abortController?.signal,
          )

          clearInterval(progressInterval)

          if (success) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f,
              ),
            )
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id
                  ? { ...f, status: 'error', progress: 0, error: 'Upload failed' }
                  : f,
              ),
            )
          }
        } catch (error) {
          // Check if it was cancelled
          if (error instanceof Error && error.name === 'AbortError') {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id
                  ? {
                      ...f,
                      status: 'cancelled',
                      progress: 0,
                      error: 'Upload cancelled',
                    }
                  : f,
              ),
            )
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id
                  ? {
                      ...f,
                      status: 'error',
                      progress: 0,
                      error: error instanceof Error ? error.message : 'Upload failed',
                    }
                  : f,
              ),
            )
          }
        }
      }

      setIsUploading(false)
    },
    [onFileUpload, currentPath],
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const cancelFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileItem = prev.find((f) => f.id === id)
      if (fileItem && fileItem.status === 'uploading' && fileItem.abortController) {
        fileItem.abortController.abort()
      }
      return prev
    })
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const retryFile = useCallback(
    async (id: string) => {
      const fileItem = files.find((f) => f.id === id)
      if (!fileItem || !onFileUpload) return

      try {
        const abortController = new AbortController()
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, status: 'uploading', progress: 0, error: undefined, abortController }
              : f,
          ),
        )

        setIsUploading(true)

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id && f.status === 'uploading'
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f,
            ),
          )
        }, 100)

        const filePath = currentPath ? `${currentPath}/${fileItem.file.name}` : fileItem.file.name
        const success = await onFileUpload(fileItem.file, filePath, abortController.signal)

        clearInterval(progressInterval)

        if (success) {
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: 'success', progress: 100 } : f)),
          )
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: 'error', progress: 0, error: 'Upload failed' } : f,
            ),
          )
        }

        setIsUploading(false)
      } catch (error) {
        // Check if it was cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'cancelled',
                    progress: 0,
                    error: 'Upload cancelled',
                  }
                : f,
            ),
          )
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'error',
                    progress: 0,
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f,
            ),
          )
        }
        setIsUploading(false)
      }
    },
    [files, onFileUpload, currentPath],
  )

  const uploadProgress =
    files.length > 0 ? files.reduce((acc, file) => acc + file.progress, 0) / files.length : 0

  return {
    isDragActive,
    files,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    removeFile,
    cancelFile,
    clearFiles,
    retryFile,
    isUploading,
    uploadProgress,
  }
}
