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
