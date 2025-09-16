import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { generateImagorUrl } from '@/api/imagor-api'
import type { ImagorParamsInput } from '@/generated/graphql'

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
  format?: string  // e.g., 'webp', 'jpeg', 'png', undefined (original)
  quality?: number // e.g., 80, 90, 95, undefined (default)
  maxBytes?: number // e.g., 100000 (100KB), undefined (no limit)
}

export interface UseImageTransformProps {
  galleryKey: string
  imageKey: string
  onPreviewUpdate?: (url: string) => void
  onError?: (error: Error) => void
}

export function useImageTransform({
  galleryKey,
  imageKey,
  onPreviewUpdate,
  onError,
}: UseImageTransformProps) {
  const [params, setParams] = useState<ImageTransformState>({})
  const deferredParams = useDeferredValue(params)
  const [aspectLocked, setAspectLocked] = useState(false)
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number | null>(null)
  const [originalDimensions, setOriginalDimensionsState] = useState<{
    width: number
    height: number
  } | null>(null)

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
    () => convertToGraphQLParams(deferredParams, true),
    [deferredParams, convertToGraphQLParams],
  )

  // Detect when params are changing (before deferred update)
  const isParamsChanging = JSON.stringify(params) !== JSON.stringify(deferredParams)

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
    enabled: Object.keys(deferredParams).length > 0, // Only run when we have deferred params
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
      console.error('Failed to generate preview URL:', error)
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

  // Update a single parameter
  const updateParam = useCallback(
    (key: keyof ImageTransformState, value: any) => {
      setParams((prev) => {
        const newParams = { ...prev, [key]: value }

        // Handle aspect ratio locking for dimensions
        if (aspectLocked && originalAspectRatio && (key === 'width' || key === 'height')) {
          if (key === 'width' && typeof value === 'number') {
            newParams.height = Math.round(value / originalAspectRatio)
          } else if (key === 'height' && typeof value === 'number') {
            newParams.width = Math.round(value * originalAspectRatio)
          }
        }

        return newParams
      })
    },
    [aspectLocked, originalAspectRatio],
  )

  // Update multiple parameters at once
  const updateParams = useCallback((updates: Partial<ImageTransformState>) => {
    setParams((prev) => ({ ...prev, ...updates }))
  }, [])

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
    }
    setParams(resetState)
  }, [originalDimensions])

  // Set original image dimensions (called when image loads)
  const setOriginalDimensions = useCallback((width: number, height: number) => {
    const aspectRatio = width / height
    setOriginalAspectRatio(aspectRatio)

    // Only store original dimensions on first call (don't overwrite)
    setOriginalDimensionsState((prev) => {
      if (prev) {
        return prev
      }
      return { width, height }
    })

    // Set original dimensions as initial params when image loads
    setParams((prev) => {
      // Only set dimensions if they haven't been explicitly set by user
      if (prev.width || prev.height) {
        return prev
      }
      // For initial load, use original dimensions
      return {
        ...prev,
        width,
        height,
        fitIn: undefined, // Remove fit mode
      }
    })
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

  // Generate initial preview URL on mount - will be updated when original dimensions are known
  useMemo(() => {
    if (Object.keys(params).length === 0) {
      // Start with fit mode, will be updated to original dimensions when image loads
      const initialState = {
        fitIn: true,
        width: undefined,
        height: undefined,
      }
      setParams(initialState)
    }
  }, [params]) // Only run on mount

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
    updateParam,
    updateParams,
    resetParams,
    setOriginalDimensions,
    toggleAspectLock,
    generateCopyUrl,
    generateDownloadUrl,
  }
}
