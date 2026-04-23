/**
 * Enhanced error information with field targeting support
 */
export interface ErrorInfo {
  message: string
  field?: string
  code?: string
  argumentName?: string
}

interface GraphQLErrorLike {
  message?: string
  extensions?: {
    field?: string
    code?: string
    argumentName?: string
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function getGraphQLErrors(error: unknown): GraphQLErrorLike[] {
  const errorRecord = asRecord(error)
  if (!errorRecord) {
    return []
  }

  const responseRecord = asRecord(errorRecord.response)
  const responseErrors = responseRecord?.errors
  if (Array.isArray(responseErrors)) {
    return responseErrors as GraphQLErrorLike[]
  }

  const directErrors = errorRecord.errors
  if (Array.isArray(directErrors)) {
    return directErrors as GraphQLErrorLike[]
  }

  return []
}

function getErrorMessageValue(error: unknown): string | null {
  const errorRecord = asRecord(error)
  if (!errorRecord) {
    return null
  }

  if (typeof errorRecord.message === 'string') {
    return errorRecord.message
  }

  const nestedErrorRecord = asRecord(errorRecord.error)
  if (typeof nestedErrorRecord?.message === 'string') {
    return nestedErrorRecord.message
  }

  return null
}

function getResponseStatus(error: unknown): number | null {
  const errorRecord = asRecord(error)
  if (!errorRecord) {
    return null
  }

  const responseRecord = asRecord(errorRecord.response)
  return typeof responseRecord?.status === 'number' ? responseRecord.status : null
}

function sanitizeErrorMessage(error: unknown, message: string): string {
  if (/^GraphQL Error \(Code: \d+\):/i.test(message)) {
    const status = getResponseStatus(error)
    return status ? `GraphQL request failed with status ${status}` : 'GraphQL request failed'
  }

  return message
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return extractErrorInfo(error).code === code
}

/**
 * Extract a clean error message from GraphQL error responses
 */
export function extractErrorMessage(error: unknown): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error
  }

  const firstError = getGraphQLErrors(error)[0]
  if (firstError?.message) {
    return firstError.message
  }

  const message = getErrorMessageValue(error)
  if (message) {
    return sanitizeErrorMessage(error, message)
  }

  // Fallback to generic message
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Extract enhanced error information including field targeting
 */
export function extractErrorInfo(error: unknown): ErrorInfo {
  // If it's already a string, return basic info
  if (typeof error === 'string') {
    return { message: error }
  }

  const firstError = getGraphQLErrors(error)[0]
  if (firstError?.message) {
    return {
      message: firstError.message,
      field: firstError.extensions?.field,
      code: firstError.extensions?.code,
      argumentName: firstError.extensions?.argumentName,
    }
  }

  const message = getErrorMessageValue(error)
  if (message) {
    return { message: sanitizeErrorMessage(error, message) }
  }

  // Fallback to generic message
  return { message: 'An unexpected error occurred. Please try again.' }
}

/**
 * Check if an error targets a specific field
 */
export function isFieldError(error: unknown, fieldName: string): boolean {
  const errorInfo = extractErrorInfo(error)
  return errorInfo.field === fieldName
}

/**
 * Get all field errors from a GraphQL response
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  for (const graphQLError of getGraphQLErrors(error)) {
    if (graphQLError.extensions?.field && graphQLError.message) {
      fieldErrors[graphQLError.extensions.field] = graphQLError.message
    }
  }

  return fieldErrors
}
