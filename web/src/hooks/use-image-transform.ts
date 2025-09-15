import { useCallback, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { debounce } from 'lodash-es'

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

  // Alignment
  hAlign?: string
  vAlign?: string

  // Filters (for Phase 4)
  brightness?: number
  contrast?: number
  saturation?: number
  grayscale?: boolean
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
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [aspectLocked, setAspectLocked] = useState(true)
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number | null>(null)

  // Mutation for generating Imagor URLs
  const generateUrlMutation = useMutation({
    mutationFn: (transformParams: ImagorParamsInput) =>
      generateImagorUrl({
        galleryKey,
        imageKey,
        params: transformParams,
      }),
    onSuccess: (url) => {
      setPreviewUrl(url)
      onPreviewUpdate?.(url)
    },
    onError: (error) => {
      console.error('Failed to generate preview URL:', error)
      onError?.(error as Error)
    },
  })

  // Convert our state to GraphQL input format
  const convertToGraphQLParams = useCallback(
    (state: ImageTransformState): Partial<ImagorParamsInput> => {
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

      if (filters.length > 0) {
        graphqlParams.filters = filters
      }

      return graphqlParams
    },
    [],
  )

  // Debounced URL generation
  const debouncedGenerateUrl = useMemo(
    () =>
      debounce((state: ImageTransformState) => {
        const graphqlParams = convertToGraphQLParams(state)
        generateUrlMutation.mutate(graphqlParams as ImagorParamsInput)
      }, 300),
    [convertToGraphQLParams, generateUrlMutation],
  )

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

        // Trigger debounced URL generation
        debouncedGenerateUrl(newParams)

        return newParams
      })
    },
    [aspectLocked, originalAspectRatio, debouncedGenerateUrl],
  )

  // Update multiple parameters at once
  const updateParams = useCallback(
    (updates: Partial<ImageTransformState>) => {
      setParams((prev) => {
        const newParams = { ...prev, ...updates }
        debouncedGenerateUrl(newParams)
        return newParams
      })
    },
    [debouncedGenerateUrl],
  )

  // Reset all parameters
  const resetParams = useCallback(() => {
    setParams({})
    setPreviewUrl('')
    // Generate URL for original image (no transforms)
    generateUrlMutation.mutate({} as ImagorParamsInput)
  }, [generateUrlMutation])

  // Set original image dimensions (called when image loads)
  const setOriginalDimensions = useCallback((width: number, height: number) => {
    const aspectRatio = width / height
    setOriginalAspectRatio(aspectRatio)

    // Set initial dimensions if not already set
    setParams((prev) => ({
      ...prev,
      width: prev.width ?? width,
      height: prev.height ?? height,
    }))
  }, [])

  // Toggle aspect ratio lock
  const toggleAspectLock = useCallback(() => {
    setAspectLocked((prev) => !prev)
  }, [])

  // Generate initial preview URL on mount
  useMemo(() => {
    if (Object.keys(params).length === 0) {
      // Generate URL for original image
      generateUrlMutation.mutate({} as ImagorParamsInput)
    }
  }, []) // Only run on mount

  return {
    // State
    params,
    previewUrl,
    aspectLocked,
    originalAspectRatio,

    // Loading states
    isLoading: generateUrlMutation.isPending,
    error: generateUrlMutation.error,

    // Actions
    updateParam,
    updateParams,
    resetParams,
    setOriginalDimensions,
    toggleAspectLock,
  }
}
