import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ImageTransform, type ImageTransformState } from '@/lib/image-transform'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'

// Re-export ImageTransformState for backward compatibility
export type { ImageTransformState }

export interface UseImageTransformProps {
  galleryKey: string
  imageKey: string
  loaderData: ImageEditorLoaderData
  onPreviewUpdate?: (url: string) => void
  onError?: (error: Error) => void
}

export function useImageTransform({
  galleryKey,
  imageKey,
  loaderData,
  onPreviewUpdate,
  onError,
}: UseImageTransformProps) {
  // React state to track the current transformation state
  const [params, setParams] = useState<ImageTransformState>(() => ({
    width: loaderData.originalDimensions.width,
    height: loaderData.originalDimensions.height,
  }))

  const [previewUrl, setPreviewUrl] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Create and manage the ImageTransform instance
  const transformRef = useRef<ImageTransform | null>(null)

  // Initialize the ImageTransform instance
  useEffect(() => {
    const transform = new ImageTransform(
      {
        galleryKey,
        imageKey,
        originalDimensions: loaderData.originalDimensions,
      },
      {
        onPreviewUpdate: (url) => {
          setPreviewUrl(url)
          onPreviewUpdate?.(url)
        },
        onError: (err) => {
          setError(err)
          onError?.(err)
        },
        onStateChange: (state) => {
          setParams(state)
        },
        onLoadingChange: (loading) => {
          setIsLoading(loading)
        },
      },
    )

    transformRef.current = transform

    // Cleanup on unmount
    return () => {
      transform.destroy()
    }
  }, [galleryKey, imageKey, loaderData.originalDimensions, onPreviewUpdate, onError])

  // Memoized values from the transform instance
  const aspectLocked = useMemo(() => transformRef.current?.isAspectLocked() ?? true, [params])
  const originalAspectRatio = useMemo(() => transformRef.current?.getOriginalAspectRatio() ?? 1, [])
  const isParamsLoading = useMemo(
    () => transformRef.current?.isParamsLoading() ?? false,
    [isLoading],
  )

  // Wrapped methods that delegate to the transform instance
  const updateParams = useCallback(
    (updates: Partial<ImageTransformState>, options?: { respectAspectLock?: boolean }) => {
      transformRef.current?.updateParams(updates, options)
    },
    [],
  )

  const resetParams = useCallback(() => {
    transformRef.current?.resetParams()
  }, [])

  const toggleAspectLock = useCallback(() => {
    transformRef.current?.toggleAspectLock()
    // Force re-render to update aspectLocked value
    setParams(transformRef.current?.getState() ?? {})
  }, [])

  const generateCopyUrl = useCallback(() => {
    return transformRef.current?.generateCopyUrl() ?? Promise.resolve('')
  }, [])

  const generateDownloadUrl = useCallback(() => {
    return transformRef.current?.generateDownloadUrl() ?? Promise.resolve('')
  }, [])

  const getCopyUrl = useCallback(() => {
    return transformRef.current?.getCopyUrl() ?? Promise.resolve('')
  }, [])

  const handleDownload = useCallback(() => {
    return (
      transformRef.current?.handleDownload() ??
      Promise.resolve({ success: false, error: 'Transform not initialized' })
    )
  }, [])

  return {
    // State
    params,
    previewUrl,
    aspectLocked,
    originalAspectRatio,

    // Loading states
    isParamsLoading,
    error,

    // Actions
    updateParams,
    resetParams,
    toggleAspectLock,
    generateCopyUrl,
    generateDownloadUrl,
    getCopyUrl,
    handleDownload,
  }
}
