/**
 * Enhanced error information with field targeting support
 */
export interface ErrorInfo {
  message: string
  field?: string
  code?: string
  argumentName?: string
}

/**
 * Extract a clean error message from GraphQL error responses
 */
export function extractErrorMessage(error: any): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error
  }

  // Check for GraphQL errors in the response
  if (error?.response?.errors && Array.isArray(error.response.errors)) {
    const firstError = error.response.errors[0]
    if (firstError?.message) {
      return firstError.message
    }
  }

  // Check for direct GraphQL errors
  if (error?.errors && Array.isArray(error.errors)) {
    const firstError = error.errors[0]
    if (firstError?.message) {
      return firstError.message
    }
  }

  // Check for error message property
  if (error?.message) {
    return error.message
  }

  // Check for nested error messages
  if (error?.error?.message) {
    return error.error.message
  }

  // Fallback to generic message
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Extract enhanced error information including field targeting
 */
export function extractErrorInfo(error: any): ErrorInfo {
  // If it's already a string, return basic info
  if (typeof error === 'string') {
    return { message: error }
  }

  // Check for GraphQL errors in the response
  if (error?.response?.errors && Array.isArray(error.response.errors)) {
    const firstError = error.response.errors[0]
    if (firstError?.message) {
      return {
        message: firstError.message,
        field: firstError.extensions?.field,
        code: firstError.extensions?.code,
        argumentName: firstError.extensions?.argumentName,
      }
    }
  }

  // Check for direct GraphQL errors
  if (error?.errors && Array.isArray(error.errors)) {
    const firstError = error.errors[0]
    if (firstError?.message) {
      return {
        message: firstError.message,
        field: firstError.extensions?.field,
        code: firstError.extensions?.code,
        argumentName: firstError.extensions?.argumentName,
      }
    }
  }

  // Check for error message property
  if (error?.message) {
    return { message: error.message }
  }

  // Check for nested error messages
  if (error?.error?.message) {
    return { message: error.error.message }
  }

  // Fallback to generic message
  return { message: 'An unexpected error occurred. Please try again.' }
}

/**
 * Check if an error targets a specific field
 */
export function isFieldError(error: any, fieldName: string): boolean {
  const errorInfo = extractErrorInfo(error)
  return errorInfo.field === fieldName
}

/**
 * Get all field errors from a GraphQL response
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  // Check for GraphQL errors in the response
  const errors = error?.response?.errors || error?.errors
  if (errors && Array.isArray(errors)) {
    for (const err of errors) {
      if (err?.extensions?.field && err?.message) {
        fieldErrors[err.extensions.field] = err.message
      }
    }
  }

  return fieldErrors
}
