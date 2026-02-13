/**
 * @fileoverview GraphQL Upload Utility
 *
 * This module provides utilities for handling GraphQL mutations with file uploads
 * using the GraphQL multipart request specification.
 *
 * @see https://github.com/jaydenseric/graphql-multipart-request-spec
 *
 * @example
 * ```typescript
 * import { UploadFileMutation } from '@/graphql/storage.gql'
 * import { uploadSingleFile } from '@/lib/graphql-upload'
 *
 * const result = await uploadSingleFile(
 *   UploadFileMutation,
 *   { path: 'example.jpg', content: file },
 *   'content',
 *   file
 * )
 * ```
 */

import type { DocumentNode } from 'graphql'
import { print } from 'graphql'

import { getBaseUrl } from '@/lib/api-utils'
import { getAuth } from '@/stores/auth-store'

export interface GraphQLUploadOptions<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
> {
  mutation: DocumentNode
  variables: TVariables
  files: Record<string, File>
  signal?: AbortSignal
}

export interface GraphQLUploadResult<TData = unknown> {
  data?: TData
  errors?: Array<{ message: string; path?: string[] }>
}

/**
 * Execute a GraphQL mutation with file uploads using the multipart request specification.
 *
 * This function handles the complex multipart form data encoding required for GraphQL file uploads,
 * automatically managing authentication, file mapping, and error handling.
 *
 * @template TVariables - The type of the GraphQL mutation variables
 * @template TData - The expected return type of the GraphQL mutation
 *
 * @param options - Configuration object for the upload
 * @param options.mutation - The GraphQL mutation DocumentNode (from gql files)
 * @param options.variables - Variables for the GraphQL mutation
 * @param options.files - Object mapping variable names to File objects
 *
 * @returns Promise resolving to the mutation result data
 *
 * @throws {GraphQLUploadError} When the upload fails or GraphQL returns errors
 *
 * @example
 * ```typescript
 * const result = await executeGraphQLUpload({
 *   mutation: UploadFileMutation,
 *   variables: { path: 'image.jpg', content: file },
 *   files: { content: file }
 * })
 * ```
 */
export async function executeGraphQLUpload<
  TVariables extends Record<string, unknown> = Record<string, unknown>,
  TData = unknown,
>({ mutation, variables, files, signal }: GraphQLUploadOptions<TVariables>): Promise<TData> {
  const endpoint = `${getBaseUrl()}/api/query`
  const auth = getAuth()

  // Create the GraphQL multipart request according to the spec
  const formData = new FormData()

  // Prepare variables with file references replaced by null
  const processedVariables = { ...variables }
  const fileMap: Record<string, string[]> = {}
  let fileIndex = 0

  // Replace file objects with null and build the file map
  for (const [key] of Object.entries(files)) {
    const variablePath = `variables.${key}`
    processedVariables[key as keyof TVariables] = null as TVariables[keyof TVariables]
    fileMap[fileIndex.toString()] = [variablePath]
    fileIndex++
  }

  // Add the GraphQL operation (must be first according to spec)
  const operations = {
    query: print(mutation),
    variables: processedVariables,
  }

  formData.append('operations', JSON.stringify(operations))
  formData.append('map', JSON.stringify(fileMap))

  // Add files after operations and map
  let currentFileIndex = 0
  for (const [, file] of Object.entries(files)) {
    formData.append(currentFileIndex.toString(), file)
    currentFileIndex++
  }

  // Set up headers
  const headers: Record<string, string> = {}
  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`
  }

  // Make the request
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }

  const result: GraphQLUploadResult<TData> = await response.json()

  if (result.errors && result.errors.length > 0) {
    const errorMessage = result.errors[0]?.message || 'Unknown GraphQL error'
    throw new Error(`GraphQL error: ${errorMessage}`)
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL mutation')
  }

  return result.data
}

/**
 * Type-safe wrapper for single file uploads.
 *
 * This is a convenience function for the common case of uploading a single file.
 * It simplifies the API by automatically handling the file mapping.
 *
 * @template TData - The expected return type of the GraphQL mutation
 *
 * @param mutation - The GraphQL mutation DocumentNode
 * @param variables - Variables for the GraphQL mutation (including the file variable)
 * @param fileKey - The key in variables that corresponds to the file
 * @param file - The File object to upload
 *
 * @returns Promise resolving to the mutation result data
 *
 * @example
 * ```typescript
 * import { UploadFileMutation } from '@/graphql/storage.gql'
 *
 * const result = await uploadSingleFile<{ uploadFile: boolean }>(
 *   UploadFileMutation,
 *   { path: 'example.jpg', content: file },
 *   'content',
 *   file
 * )
 *
 * console.log(result.uploadFile) // true if successful
 * ```
 */
export async function uploadSingleFile<TData = unknown>(
  mutation: DocumentNode,
  variables: Record<string, unknown>,
  fileKey: string,
  file: File,
  signal?: AbortSignal,
): Promise<TData> {
  return executeGraphQLUpload({
    mutation,
    variables,
    files: { [fileKey]: file },
    signal,
  })
}

/**
 * Enhanced error class for GraphQL upload errors.
 *
 * Provides additional context about upload failures, including HTTP status codes
 * and GraphQL-specific error information.
 *
 * @example
 * ```typescript
 * try {
 *   await uploadSingleFile(mutation, variables, 'file', file)
 * } catch (error) {
 *   if (error instanceof GraphQLUploadError) {
 *     console.error('Upload failed:', error.message)
 *     console.error('Status code:', error.statusCode)
 *     console.error('GraphQL errors:', error.graphqlErrors)
 *   }
 * }
 * ```
 */
export class GraphQLUploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly graphqlErrors?: Array<{ message: string; path?: string[] }>,
  ) {
    super(message)
    this.name = 'GraphQLUploadError'
  }
}
