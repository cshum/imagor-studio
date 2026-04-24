import { ClientError } from 'graphql-request'

import type {
  BeginStorageUploadProbeMutation,
  BeginStorageUploadProbeMutationVariables,
  CompleteStorageUploadProbeMutation,
  CompleteStorageUploadProbeMutationVariables,
  ConfigureFileStorageMutation,
  ConfigureFileStorageMutationVariables,
  ConfigureS3StorageMutation,
  ConfigureS3StorageMutationVariables,
  CopyFileMutation,
  CopyFileMutationVariables,
  CreateFolderMutation,
  CreateFolderMutationVariables,
  DeleteFileMutation,
  DeleteFileMutationVariables,
  ListFilesQuery,
  ListFilesQueryVariables,
  MoveFileMutation,
  MoveFileMutationVariables,
  RegenerateTemplatePreviewMutation,
  RegenerateTemplatePreviewMutationVariables,
  RequestUploadMutation,
  RequestUploadMutationVariables,
  SaveTemplateMutation,
  SaveTemplateMutationVariables,
  SortOption,
  SortOrder,
  StatFileQuery,
  StatFileQueryVariables,
  StorageConfigInput,
  StorageStatusQuery,
  TestStorageConfigMutation,
  TestStorageConfigMutationVariables,
  UploadFileMutation,
} from '@/generated/graphql'
import { getSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

export interface UploadFileOptions {
  signal?: AbortSignal
  spaceID?: string
  onProgress?: (progress: number) => void
}

interface StorageProbeOptions {
  signal?: AbortSignal
}

const STORAGE_UPLOAD_PROBE_CONTENT = 'ok'
const STORAGE_UPLOAD_PROBE_FILENAME = 'imagor-studio-probe.txt'
const STORAGE_UPLOAD_PROBE_CONTENT_TYPE = 'text/plain'

function getUploadContentType(file: File): string {
  return file.type.trim() || 'application/octet-stream'
}

function isPresignedUploadUnsupported(error: unknown): boolean {
  if (error instanceof ClientError) {
    return (
      error.response.errors?.some((graphqlError) => {
        const code = graphqlError.extensions?.code
        return code === 'NOT_AVAILABLE'
      }) ?? false
    )
  }

  return error instanceof Error && error.message.includes('does not support presigned uploads')
}

function isBrowserProbeMutationUnavailable(error: unknown): boolean {
  if (!(error instanceof ClientError)) {
    return false
  }

  const errorMessages =
    error.response.errors
      ?.map((graphqlError) => graphqlError.message)
      .filter((message): message is string => Boolean(message)) ?? []

  if (
    errorMessages.some((message) =>
      /(Cannot query field|Unknown argument|Unknown type|beginStorageUploadProbe|completeStorageUploadProbe)/i.test(
        message,
      ),
    )
  ) {
    return true
  }

  return error.response.status === 400
}

async function uploadToPresignedUrl(
  uploadURL: string,
  file: File,
  options: UploadFileOptions,
): Promise<void> {
  const contentType = getUploadContentType(file)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let aborted = false

    const cleanup = () => {
      if (options.signal) {
        options.signal.removeEventListener('abort', handleAbort)
      }
    }

    const handleAbort = () => {
      aborted = true
      xhr.abort()
    }

    xhr.open('PUT', uploadURL)
    xhr.responseType = 'text'
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress || !event.lengthComputable) {
        return
      }
      options.onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onerror = () => {
      cleanup()
      reject(new Error('Upload failed'))
    }

    xhr.onabort = () => {
      cleanup()
      reject(
        aborted
          ? new DOMException('The operation was aborted.', 'AbortError')
          : new Error('Upload aborted'),
      )
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
        return
      }
      resolve()
    }

    if (options.signal) {
      if (options.signal.aborted) {
        handleAbort()
        return
      }
      options.signal.addEventListener('abort', handleAbort, { once: true })
    }

    xhr.send(file)
  })
}

export async function requestUpload(
  variables: RequestUploadMutationVariables,
): Promise<RequestUploadMutation['requestUpload']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.RequestUpload(variables)
  return result.requestUpload
}

/**
 * List files and folders in a directory
 */
export async function listFiles(
  variables: ListFilesQueryVariables,
): Promise<ListFilesQuery['listFiles']> {
  const sdk = getSdk(getGraphQLClient())

  const result = await sdk.ListFiles(variables)
  return result.listFiles
}

/**
 * Get file/folder statistics
 */
export async function statFile(
  path: string,
  spaceID?: string,
): Promise<StatFileQuery['statFile']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: StatFileQueryVariables = { path, spaceID }
  const result = await sdk.StatFile(variables)
  return result.statFile
}

/**
 * Upload a file using the GraphQL upload utility
 */
export async function uploadFile(
  path: string,
  file: File,
  options: UploadFileOptions = {},
): Promise<UploadFileMutation['uploadFile']> {
  const { UploadFileMutation } = await import('@/graphql/storage.gql')
  const { uploadSingleFile } = await import('@/lib/graphql-upload')

  interface UploadFileResult {
    uploadFile: boolean
  }

  try {
    const presignResult = await requestUpload({
      path,
      spaceID: options.spaceID,
      contentType: getUploadContentType(file),
      sizeBytes: file.size,
    })

    await uploadToPresignedUrl(presignResult.uploadURL, file, options)
    return true
  } catch (error) {
    if (!isPresignedUploadUnsupported(error)) {
      throw error
    }
  }

  const result = await uploadSingleFile<UploadFileResult>(
    UploadFileMutation,
    { path, spaceID: options.spaceID, content: file },
    'content',
    file,
    options.signal,
    options.onProgress,
  )

  return result.uploadFile
}

/**
 * Delete a file or folder
 */
export async function deleteFile(
  path: string,
  spaceID?: string,
): Promise<DeleteFileMutation['deleteFile']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteFileMutationVariables = { path, spaceID }
  const result = await sdk.DeleteFile(variables)
  return result.deleteFile
}

/**
 * Create a new folder
 */
export async function createFolder(
  path: string,
  spaceID?: string,
): Promise<CreateFolderMutation['createFolder']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: CreateFolderMutationVariables = { path, spaceID }
  const result = await sdk.CreateFolder(variables)
  return result.createFolder
}

/**
 * List files with pagination helper
 */
export async function listFilesPaginated(params: {
  path: string
  spaceID?: string
  page?: number
  pageSize?: number
  onlyFiles?: boolean
  onlyFolders?: boolean
  sortBy?: SortOption
  sortOrder?: SortOrder
}) {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const offset = (page - 1) * pageSize

  const result = await listFiles({
    path: params.path,
    spaceID: params.spaceID,
    offset,
    limit: pageSize,
    onlyFiles: params.onlyFiles,
    onlyFolders: params.onlyFolders,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  })

  return {
    items: result.items,
    totalCount: result.totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(result.totalCount / pageSize),
    hasNextPage: offset + pageSize < result.totalCount,
    hasPreviousPage: page > 1,
  }
}

/**
 * Get storage status
 */
export async function getStorageStatus(): Promise<StorageStatusQuery['storageStatus']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.StorageStatus()
  return result.storageStatus
}

/**
 * Configure file storage
 */
export async function configureFileStorage(
  variables: ConfigureFileStorageMutationVariables,
): Promise<ConfigureFileStorageMutation['configureFileStorage']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.ConfigureFileStorage(variables)
  return result.configureFileStorage
}

/**
 * Configure S3 storage
 */
export async function configureS3Storage(
  variables: ConfigureS3StorageMutationVariables,
): Promise<ConfigureS3StorageMutation['configureS3Storage']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.ConfigureS3Storage(variables)
  return result.configureS3Storage
}

/**
 * Test storage configuration
 */
export async function testStorageConfig(
  variables: TestStorageConfigMutationVariables,
): Promise<TestStorageConfigMutation['testStorageConfig']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.TestStorageConfig(variables)
  return result.testStorageConfig
}

export async function beginStorageUploadProbe(
  variables: BeginStorageUploadProbeMutationVariables,
): Promise<BeginStorageUploadProbeMutation['beginStorageUploadProbe']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.BeginStorageUploadProbe(variables)
  return result.beginStorageUploadProbe
}

export async function completeStorageUploadProbe(
  variables: CompleteStorageUploadProbeMutationVariables,
): Promise<CompleteStorageUploadProbeMutation['completeStorageUploadProbe']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.CompleteStorageUploadProbe(variables)
  return result.completeStorageUploadProbe
}

export async function testStorageConfigWithBrowserProbe(
  input: StorageConfigInput,
  options: StorageProbeOptions = {},
): Promise<TestStorageConfigMutation['testStorageConfig']> {
  const serverResult = await testStorageConfig({ input })
  if (!serverResult.success || input.type !== 'S3') {
    return serverResult
  }

  const probeFile = new File([STORAGE_UPLOAD_PROBE_CONTENT], STORAGE_UPLOAD_PROBE_FILENAME, {
    type: STORAGE_UPLOAD_PROBE_CONTENT_TYPE,
  })
  let probe: BeginStorageUploadProbeMutation['beginStorageUploadProbe']

  try {
    probe = await beginStorageUploadProbe({
      input,
      contentType: probeFile.type,
      sizeBytes: probeFile.size,
    })
  } catch (error) {
    if (isBrowserProbeMutationUnavailable(error)) {
      return serverResult
    }
    throw error
  }

  try {
    await uploadToPresignedUrl(probe.uploadURL, probeFile, { signal: options.signal })
  } catch (error) {
    return {
      success: false,
      code: 'S3_CORS_PROBE_FAILED',
      message: 'Browser upload probe failed. Check bucket CORS for this app origin.',
      details: error instanceof Error ? error.message : 'Upload probe failed',
    }
  }

  try {
    return await completeStorageUploadProbe({
      input,
      probePath: probe.probePath,
      expectedContent: STORAGE_UPLOAD_PROBE_CONTENT,
    })
  } catch (error) {
    if (isBrowserProbeMutationUnavailable(error)) {
      return serverResult
    }
    throw error
  }
}

/**
 * Copy a file or folder
 */
export async function copyFile(
  sourcePath: string,
  destPath: string,
  spaceID?: string,
): Promise<CopyFileMutation['copyFile']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: CopyFileMutationVariables = { sourcePath, destPath, spaceID }
  const result = await sdk.CopyFile(variables)
  return result.copyFile
}

/**
 * Move/rename a file or folder
 */
export async function moveFile(
  sourcePath: string,
  destPath: string,
  spaceID?: string,
): Promise<MoveFileMutation['moveFile']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: MoveFileMutationVariables = { sourcePath, destPath, spaceID }
  const result = await sdk.MoveFile(variables)
  return result.moveFile
}

/**
 * Save a template to the .templates folder
 */
export async function saveTemplate(
  variables: SaveTemplateMutationVariables,
): Promise<SaveTemplateMutation['saveTemplate']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.SaveTemplate(variables)
  return result.saveTemplate
}

/**
 * Regenerate the preview image for an existing template.
 * Reads the template JSON from storage, generates a new preview via imagor,
 * and writes it back as a .imagor.preview file.
 * Returns true on success, false if generation fails (non-throwing).
 */
export async function regenerateTemplatePreview(
  templatePath: string,
  spaceID?: string,
): Promise<RegenerateTemplatePreviewMutation['regenerateTemplatePreview']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: RegenerateTemplatePreviewMutationVariables = { templatePath, spaceID }
  const result = await sdk.RegenerateTemplatePreview(variables)
  return result.regenerateTemplatePreview
}
