import React, { useCallback, useState } from 'react'
import { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { extractErrorInfo, extractFieldErrors } from '@/lib/error-utils'

type ChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void

/**
 * Custom hook for handling form errors with field-specific highlighting
 */
export function useFormErrors<T extends FieldValues>() {
  const { t } = useTranslation()

  /**
   * Process server errors and set field-specific errors on the form
   */
  const processServerError = useCallback(
    (
      error: unknown,
      setError: UseFormSetError<T>,
      setGeneralError?: (error: string | null) => void,
      errorTranslations?: Record<string, Record<string, string>>,
    ) => {
      const errorInfo = extractErrorInfo(error)
      const fieldErrors = extractFieldErrors(error)

      // Check for field-specific errors first
      let hasFieldError = false

      // Handle multiple field errors
      for (const [fieldName, fieldMessage] of Object.entries(fieldErrors)) {
        const fieldTranslations = errorTranslations?.[fieldName]
        let translatedMessage = fieldMessage

        // Check if we have a translation for this error code or wildcard
        if (fieldTranslations) {
          if (errorInfo.code && fieldTranslations[errorInfo.code]) {
            translatedMessage = t(fieldTranslations[errorInfo.code])
          } else if (fieldTranslations['*']) {
            translatedMessage = t(fieldTranslations['*'])
          }
        }

        setError(fieldName as Path<T>, {
          type: 'server',
          message: translatedMessage,
        })
        hasFieldError = true
      }

      // Handle single field error if no multiple field errors
      if (!hasFieldError && errorInfo.field) {
        const fieldTranslations = errorTranslations?.[errorInfo.field]
        let translatedMessage = errorInfo.message

        // Check if we have a translation for this error code or wildcard
        if (fieldTranslations) {
          if (errorInfo.code && fieldTranslations[errorInfo.code]) {
            translatedMessage = t(fieldTranslations[errorInfo.code])
          } else if (fieldTranslations['*']) {
            translatedMessage = t(fieldTranslations['*'])
          }
        }

        setError(errorInfo.field as Path<T>, {
          type: 'server',
          message: translatedMessage,
        })
        hasFieldError = true
      }

      if (hasFieldError) {
        // Clear general error since we have field-specific errors
        setGeneralError?.(null)
      } else {
        // Set general error for non-field-specific errors
        setGeneralError?.(errorInfo.message)
      }
    },
    [t],
  )

  /**
   * Simplified error handler that shows toast for general errors
   */
  const handleFormError = useCallback(
    (
      error: unknown,
      setError: UseFormSetError<T>,
      errorTranslations?: Record<string, Record<string, string>>,
      fallbackMessage?: string,
    ) => {
      processServerError(
        error,
        setError,
        (generalError) => {
          if (generalError) {
            toast.error(fallbackMessage || generalError)
          }
        },
        errorTranslations,
      )
    },
    [processServerError],
  )

  /**
   * Clear field-specific server errors when user starts typing
   */
  const createFieldChangeHandler = useCallback(
    (
      fieldName: string,
      originalOnChange: ChangeHandler,
      clearError: (name: Path<T>) => void,
      clearGeneralError?: () => void,
    ) => {
      return (event: React.ChangeEvent<HTMLInputElement>) => {
        // Clear field-specific error
        clearError(fieldName as Path<T>)

        // Clear general error as well when user starts typing
        clearGeneralError?.()

        // Call original onChange
        originalOnChange(event)
      }
    },
    [],
  )

  return {
    processServerError,
    handleFormError,
    createFieldChangeHandler,
  }
}

/**
 * Hook for managing general form error state
 */
export function useGeneralFormError() {
  const [generalError, setGeneralError] = useState<string | null>(null)

  const clearGeneralError = useCallback(() => setGeneralError(null), [])

  return {
    generalError,
    setGeneralError,
    clearGeneralError,
  }
}
