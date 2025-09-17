import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'
import { getFullImageUrl } from '@/lib/api-utils'
import type { ImageEditorLoaderData } from '@/loaders/image-editor-loader'

export interface ImageTransformState {
  // Dimensions
  width?: number
  height?: number

  // Cropping
  cropLeft?: number
  cropTop?: number
  cropRight?: number
  cropBottom?: number

  // Fitting
  fitIn?: boolean
  stretch?: boolean
  smart?: boolean

  // Alignment
  hAlign?: string
  vAlign?: string

  // Filters (for Phase 4)
  brightness?: number
  contrast?: number
  saturation?: number
  hue?: number
  blur?: number
  sharpen?: number
  grayscale?: boolean

  // Transform (for Phase 5)
  hFlip?: boolean
  vFlip?: boolean
  rotation?: number // 0, 90, 180, 270

  // Output format and quality
  format?: string // e.g., 'webp', 'jpeg', 'png', undefined (original)
  quality?: number // e.g., 80, 90, 95, undefined (default)
  maxBytes?: number // e.g., 100000 (100KB), undefined (no limit)

  // Auto trim
  autoTrim?: boolean // Remove whitespace/transparent edges
}

export interface UseImageTransformProps {
  galleryKey: string
  imageKey: string
  loaderData: ImageEditorLoaderData
  onPreviewUpdate?: (url: string) => void
  onError?: (error: Error) => void
}

// Custom debounce hook for 500ms delay
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useImageTransform({
  galleryKey,
  imageKey,
  loaderData,
  onPreviewUpdate,
  onError,
}: UseImageTransformProps) {
  // Initialize params directly with loader data
  const [params, setParams] = useState<ImageTransformState>(() => ({
    width: loaderData.originalDimensions.width,
    height: loaderData.originalDimensions.height,
  }))

  // Use 500ms debounce instead of useDeferredValue
  const debouncedParams = useDebounce(params, 500)
  const [aspectLocked, setAspectLocked] = useState(true)
  const [lockedAspectRatio, setLockedAspectRatio] = useState<number | null>(null)
  const originalAspectRatio =
    loaderData.originalDimensions.width / loaderData.originalDimensions.height
  const originalDimensions = loaderData.originalDimensions

  // Initialize locked aspect ratio when component loads (since aspectLocked starts as true)
  useEffect(() => {
    if (aspectLocked && !lockedAspectRatio && params.width && params.height) {
      setLockedAspectRatio(params.width / params.height)
    }
  }, [aspectLocked, lockedAspectRatio, params.width, params.height])

  // Convert our state to GraphQL input format
  const convertToGraphQLParams = useCallback(
    (state: ImageTransformState, forPreview = false): Partial<ImagorParamsInput> => {
      const graphqlParams: Partial<ImagorParamsInput> = {}

      // Dimensions
      if (state.width !== undefined) graphqlParams.width = state.width
      if (state.height !== undefined) graphqlParams.height = state.height

      // Cropping
      if (state.cropLeft !== undefined) graphqlParams.cropLeft = state.cropLeft
      if (state.cropTop !== undefined) graphqlParams.cropTop = state.cropTop
      if (state.cropRight !== undefined) graphqlParams.cropRight = state.cropRight
      if (state.cropBottom !== undefined) graphqlParams.cropBottom = state.cropBottom

      // Fitting
      if (state.fitIn !== undefined) graphqlParams.fitIn = state.fitIn
      if (state.stretch !== undefined) graphqlParams.stretch = state.stretch
      if (state.smart !== undefined) graphqlParams.smart = state.smart

      // Alignment
      if (state.hAlign) graphqlParams.hAlign = state.hAlign
      if (state.vAlign) graphqlParams.vAlign = state.vAlign

      // Transform (for Phase 5)
      if (state.hFlip !== undefined) graphqlParams.hFlip = state.hFlip
      if (state.vFlip !== undefined) graphqlParams.vFlip = state.vFlip

      // Filters (for Phase 4)
      const filters: Array<{ name: string; args: string }> = []

      if (state.brightness !== undefined && state.brightness !== 0) {
        filters.push({ name: 'brightness', args: state.brightness.toString() })
      }
      if (state.contrast !== undefined && state.contrast !== 0) {
        filters.push({ name: 'contrast', args: state.contrast.toString() })
      }
      if (state.saturation !== undefined && state.saturation !== 0) {
        filters.push({ name: 'saturation', args: state.saturation.toString() })
      }
      if (state.hue !== undefined && state.hue !== 0) {
        filters.push({ name: 'hue', args: state.hue.toString() })
      }
      if (state.blur !== undefined && state.blur !== 0) {
        filters.push({ name: 'blur', args: state.blur.toString() })
      }
      if (state.sharpen !== undefined && state.sharpen !== 0) {
        filters.push({ name: 'sharpen', args: state.sharpen.toString() })
      }
      if (state.grayscale) {
        filters.push({ name: 'grayscale', args: '' })
      }
      if (state.rotation !== undefined && state.rotation !== 0) {
        filters.push({ name: 'rotate', args: state.rotation.toString() })
      }

      // Auto trim handling
      if (state.autoTrim) {
        filters.push({ name: 'trim', args: '' })
      }

      // Format handling
      if (forPreview) {
        // Always WebP for preview (browser compatibility)
        filters.push({ name: 'format', args: 'webp' })
      } else if (state.format) {
        // Use user-selected format for Copy URL / Download
        filters.push({ name: 'format', args: state.format })
      }
      // If no format specified, Imagor uses original format

      // Quality handling (only if format is specified)
      if (state.quality && (forPreview || state.format)) {
        filters.push({ name: 'quality', args: state.quality.toString() })
      }

      // Max bytes handling (automatic quality degradation)
      if (state.maxBytes && (forPreview || state.format || state.quality)) {
        filters.push({ name: 'max_bytes', args: state.maxBytes.toString() })
      }

      if (filters.length > 0) {
        graphqlParams.filters = filters
      }

      return graphqlParams
    },
    [],
  )

  // Convert our state to GraphQL input format for query key (with WebP for preview)
  const graphqlParams = useMemo(
    () => convertToGraphQLParams(debouncedParams, true),
    [debouncedParams, convertToGraphQLParams],
  )

  // Detect when params are changing (before debounced update)
  const isParamsChanging = JSON.stringify(params) !== JSON.stringify(debouncedParams)

  // Use React Query for automatic request management
  const {
    data: previewUrl,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['imagor-preview', galleryKey, imageKey, graphqlParams],
    queryFn: () =>
      generateImagorUrl({
        galleryKey,
        imageKey,
        params: graphqlParams as ImagorParamsInput,
      }),
    enabled: Object.keys(debouncedParams).length > 0, // Only run when we have debounced params
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false,
  })

  // Use initial preview URL only when no transformed URL is available
  const effectivePreviewUrl = previewUrl || loaderData.initialPreviewUrl

  // Notify parent when preview URL changes
  useMemo(() => {
    if (previewUrl) {
      onPreviewUpdate?.(previewUrl)
    }
  }, [previewUrl, onPreviewUpdate])

  // Handle errors
  useMemo(() => {
    if (error) {
      onError?.(error as Error)
    }
  }, [error, onError])

  // Mutation for download URL generation (separate from preview)
  const downloadMutation = useMutation({
    mutationFn: (transformParams: ImagorParamsInput) =>
      generateImagorUrl({
        galleryKey,
        imageKey,
        params: transformParams,
      }),
  })

  // Update parameters with optional aspect ratio locking
  const updateParams = useCallback(
    (updates: Partial<ImageTransformState>, options?: { respectAspectLock?: boolean }) => {
      setParams((prev) => {
        const newParams = { ...prev, ...updates }

        // Apply aspect ratio logic if enabled and we're updating dimensions
        if (
          options?.respectAspectLock &&
          aspectLocked &&
          lockedAspectRatio &&
          (updates.width !== undefined || updates.height !== undefined)
        ) {
          if (updates.width !== undefined) {
            newParams.height = Math.round(updates.width / lockedAspectRatio)
          } else if (updates.height !== undefined) {
            newParams.width = Math.round(updates.height * lockedAspectRatio)
          }
        }

        return newParams
      })
    },
    [aspectLocked, lockedAspectRatio],
  )

  // Reset all parameters
  const resetParams = useCallback(() => {
    const resetState: ImageTransformState = {
      // Reset to original dimensions if available
      width: originalDimensions?.width,
      height: originalDimensions?.height,
      // Clear all other transforms
      cropLeft: undefined,
      cropTop: undefined,
      cropRight: undefined,
      cropBottom: undefined,
      fitIn: undefined,
      stretch: undefined,
      smart: undefined,
      hAlign: undefined,
      vAlign: undefined,
      brightness: undefined,
      contrast: undefined,
      saturation: undefined,
      hue: undefined,
      blur: undefined,
      sharpen: undefined,
      grayscale: undefined,
      hFlip: undefined,
      vFlip: undefined,
      rotation: undefined,
      format: undefined,
      quality: undefined,
      maxBytes: undefined,
      autoTrim: undefined,
    }
    setParams(resetState)
  }, [originalDimensions])


  // Toggle aspect ratio lock
  const toggleAspectLock = useCallback(() => {
    setAspectLocked((prev) => {
      const newLocked = !prev

      // When locking is enabled, capture the current aspect ratio
      if (newLocked && params.width && params.height) {
        setLockedAspectRatio(params.width / params.height)
      } else if (!newLocked) {
        // When unlocking, clear the locked aspect ratio
        setLockedAspectRatio(null)
      }

      return newLocked
    })
  }, [params.width, params.height])

  // Generate copy URL with user-selected format (not WebP)
  const generateCopyUrl = useCallback(() => {
    const copyParams = convertToGraphQLParams(params, false) // false = no WebP override
    return generateImagorUrl({
      galleryKey,
      imageKey,
      params: copyParams as ImagorParamsInput,
    })
  }, [params, convertToGraphQLParams, galleryKey, imageKey])

  // Generate download URL with attachment filter
  const generateDownloadUrl = useCallback(() => {
    const downloadParams = {
      ...convertToGraphQLParams(params, false), // false = no WebP override
      filters: [
        ...(convertToGraphQLParams(params, false).filters || []),
        { name: 'attachment', args: '' }, // Empty args for default filename
      ],
    }

    return downloadMutation.mutateAsync(downloadParams as ImagorParamsInput)
  }, [params, convertToGraphQLParams, downloadMutation])

  // Get copy URL for dialog display
  const getCopyUrl = useCallback(async (): Promise<string> => {
    const copyUrl = await generateCopyUrl()
    return getFullImageUrl(copyUrl)
  }, [generateCopyUrl])

  // Simplified download function using location.href
  const handleDownload = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const downloadUrl = await generateDownloadUrl()

      // Use location.href for reliable downloads across all browsers
      window.location.href = getFullImageUrl(downloadUrl)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download image',
      }
    }
  }, [generateDownloadUrl])

  return {
    // State
    params,
    previewUrl: effectivePreviewUrl,
    aspectLocked,
    originalAspectRatio,

    // Loading states - simplified since PreloadImage handles image loading
    isLoadingBarVisible: isFetching || isParamsChanging, // Show loading during debounce + fetch only
    error,

    // Actions
    updateParams,
    resetParams,
    toggleAspectLock,
    generateCopyUrl,
    generateDownloadUrl,

    // New simplified actions
    getCopyUrl,
    handleDownload,
  }
}
