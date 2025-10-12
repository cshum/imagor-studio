import React, { useCallback, useRef, useState } from 'react'

import { isValidFileExtension } from '@/lib/file-extensions'
import { generateUniqueFilename } from '@/lib/file-utils'

export interface DragDropFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export interface UseDragDropOptions {
  onFilesAdded?: (files: File[]) => void
  onFileUpload?: (file: File, path: string) => Promise<boolean>
  onFilesDropped?: () => void
  existingFiles?: string[]
  imageExtensions?: string
  videoExtensions?: string
  maxFileSize?: number
  maxFiles?: number
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
  uploadFiles: () => Promise<void>
  removeFile: (id: string) => void
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
    imageExtensions = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif',
    videoExtensions = '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg',
    maxFileSize = 50 * 1024 * 1024, // 50MB
    maxFiles = 10,
    currentPath = '',
  } = options

  const [isDragActive, setIsDragActive] = useState(false)
  const [files, setFiles] = useState<DragDropFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const dragCounter = useRef(0)

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxFileSize) {
        return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`
      }

      // Check file extension (more reliable than MIME type)
      if (!isValidFileExtension(file.name, imageExtensions, videoExtensions)) {
        return 'File type not supported.'
      }

      return null
    },
    [imageExtensions, videoExtensions, maxFileSize],
  )

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles: DragDropFile[] = []
      const errors: string[] = []
      const usedNames: string[] = []

      for (const file of newFiles) {
        if (files.length + validFiles.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`)
          break
        }

        const error = validateFile(file)
        if (error) {
          errors.push(`${file.name}: ${error}`)
          continue
        }

        // Check for duplicates in current upload queue
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size,
        )
        if (isDuplicate) {
          errors.push(`${file.name}: File already added`)
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

        validFiles.push({
          file: fileToAdd,
          id: `${uniqueFileName}-${file.size}-${Date.now()}-${Math.random()}`,
          status: 'pending',
          progress: 0,
        })
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles])
        onFilesAdded?.(validFiles.map((f) => f.file))
      }
    },
    [files, maxFiles, validateFile, onFilesAdded, existingFiles],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
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

  const uploadFiles = useCallback(async () => {
    if (!onFileUpload || isUploading) return

    setIsUploading(true)
    const pendingFiles = files.filter((f) => f.status === 'pending')

    for (const fileItem of pendingFiles) {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f)),
        )

        // Simulate progress updates (you might want to implement real progress tracking)
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
        const success = await onFileUpload(fileItem.file, filePath)

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

    setIsUploading(false)
  }, [files, onFileUpload, isUploading, currentPath])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const retryFile = useCallback(
    async (id: string) => {
      const fileItem = files.find((f) => f.id === id)
      if (!fileItem || !onFileUpload) return

      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'uploading', progress: 0, error: undefined } : f,
          ),
        )

        const filePath = currentPath ? `${currentPath}/${fileItem.file.name}` : fileItem.file.name
        const success = await onFileUpload(fileItem.file, filePath)

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
      } catch (error) {
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
    uploadFiles,
    removeFile,
    clearFiles,
    retryFile,
    isUploading,
    uploadProgress,
  }
}
