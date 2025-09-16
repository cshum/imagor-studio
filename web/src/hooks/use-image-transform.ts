import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'
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
  grayscale?: boolean

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
  const originalAspectRatio =
    loaderData.originalDimensions.width / loaderData.originalDimensions.height
  const originalDimensions = loaderData.originalDimensions

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
      if (state.grayscale) {
        filters.push({ name: 'grayscale', args: '' })
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
    data: previewUrl = '',
    isLoading,
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
        let newParams = { ...prev, ...updates }

        // Apply aspect ratio logic if enabled and we're updating dimensions
        if (
          options?.respectAspectLock &&
          aspectLocked &&
          originalAspectRatio &&
          (updates.width !== undefined || updates.height !== undefined)
        ) {
          if (updates.width !== undefined && typeof updates.width === 'number') {
            newParams.height = Math.round(updates.width / originalAspectRatio)
          } else if (updates.height !== undefined && typeof updates.height === 'number') {
            newParams.width = Math.round(updates.height * originalAspectRatio)
          }
        }

        return newParams
      })
    },
    [aspectLocked, originalAspectRatio],
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
      grayscale: undefined,
      format: undefined,
      quality: undefined,
      maxBytes: undefined,
      autoTrim: undefined,
    }
    setParams(resetState)
  }, [originalDimensions])

  // No longer needed - dimensions are pre-loaded from loader data
  const setOriginalDimensions = useCallback(() => {
    // This is kept for backward compatibility with PreviewArea
    // but does nothing since dimensions are already set from loader data
  }, [])

  // Toggle aspect ratio lock
  const toggleAspectLock = useCallback(() => {
    setAspectLocked((prev) => !prev)
  }, [])

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

  return {
    // State
    params,
    previewUrl,
    aspectLocked,
    originalAspectRatio,

    // Loading states
    isLoading, // First request loading state (for image display logic)
    isLoadingBarVisible: isFetching || isParamsChanging, // Show loading during debounce + fetch
    error,

    // Actions
    updateParams,
    resetParams,
    setOriginalDimensions,
    toggleAspectLock,
    generateCopyUrl,
    generateDownloadUrl,
  }
}
