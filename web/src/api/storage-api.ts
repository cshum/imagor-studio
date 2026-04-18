import { getSharedGraphQLSdkWithClient } from '@/api/generated-clients'
import type {
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
  SaveTemplateMutation,
  SaveTemplateMutationVariables,
  SortOption,
  SortOrder,
  StatFileQuery,
  StatFileQueryVariables,
  StorageStatusQuery,
  TestStorageConfigMutation,
  TestStorageConfigMutationVariables,
  UploadFileMutation,
} from '@/types/generated-shared'

/**
 * List files and folders in a directory
 */
export async function listFiles(
  variables: ListFilesQueryVariables,
): Promise<ListFilesQuery['listFiles']> {
  const sdk = getSharedGraphQLSdkWithClient()

  const result = await sdk.ListFiles(variables)
  return result.listFiles
}

/**
 * Get file/folder statistics
 */
export async function statFile(
  path: string,
  spaceKey?: string,
): Promise<StatFileQuery['statFile']> {
  const sdk = getSharedGraphQLSdkWithClient()

  const variables: StatFileQueryVariables = { path, spaceKey }
  const result = await sdk.StatFile(variables)
  return result.statFile
}

/**
 * Upload a file using the GraphQL upload utility
 */
export async function uploadFile(
  path: string,
  file: File,
  signal?: AbortSignal,
  spaceKey?: string,
): Promise<UploadFileMutation['uploadFile']> {
  const { UploadFileMutation } = await import('@/graphql/shared/storage.gql')
  const { uploadSingleFile } = await import('@/lib/graphql-upload')

  interface UploadFileResult {
    uploadFile: boolean
  }

  const result = await uploadSingleFile<UploadFileResult>(
    UploadFileMutation,
    { path, spaceKey, content: file },
    'content',
    file,
    signal,
  )

  return result.uploadFile
}

/**
 * Delete a file or folder
 */
export async function deleteFile(
  path: string,
  spaceKey?: string,
): Promise<DeleteFileMutation['deleteFile']> {
  const sdk = getSharedGraphQLSdkWithClient()

  const variables: DeleteFileMutationVariables = { path, spaceKey }
  const result = await sdk.DeleteFile(variables)
  return result.deleteFile
}

/**
 * Create a new folder
 */
export async function createFolder(
  path: string,
  spaceKey?: string,
): Promise<CreateFolderMutation['createFolder']> {
  const sdk = getSharedGraphQLSdkWithClient()

  const variables: CreateFolderMutationVariables = { path, spaceKey }
  const result = await sdk.CreateFolder(variables)
  return result.createFolder
}

/**
 * List files with pagination helper
 */
export async function listFilesPaginated(params: {
  path: string
  spaceKey?: string
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
    spaceKey: params.spaceKey,
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
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.StorageStatus()
  return result.storageStatus
}

/**
 * Configure file storage
 */
export async function configureFileStorage(
  variables: ConfigureFileStorageMutationVariables,
): Promise<ConfigureFileStorageMutation['configureFileStorage']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.ConfigureFileStorage(variables)
  return result.configureFileStorage
}

/**
 * Configure S3 storage
 */
export async function configureS3Storage(
  variables: ConfigureS3StorageMutationVariables,
): Promise<ConfigureS3StorageMutation['configureS3Storage']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.ConfigureS3Storage(variables)
  return result.configureS3Storage
}

/**
 * Test storage configuration
 */
export async function testStorageConfig(
  variables: TestStorageConfigMutationVariables,
): Promise<TestStorageConfigMutation['testStorageConfig']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.TestStorageConfig(variables)
  return result.testStorageConfig
}

/**
 * Copy a file or folder
 */
export async function copyFile(
  sourcePath: string,
  destPath: string,
  spaceKey?: string,
): Promise<CopyFileMutation['copyFile']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const variables: CopyFileMutationVariables = { sourcePath, destPath, spaceKey }
  const result = await sdk.CopyFile(variables)
  return result.copyFile
}

/**
 * Move/rename a file or folder
 */
export async function moveFile(
  sourcePath: string,
  destPath: string,
  spaceKey?: string,
): Promise<MoveFileMutation['moveFile']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const variables: MoveFileMutationVariables = { sourcePath, destPath, spaceKey }
  const result = await sdk.MoveFile(variables)
  return result.moveFile
}

/**
 * Save a template to the .templates folder
 */
export async function saveTemplate(
  variables: SaveTemplateMutationVariables,
): Promise<SaveTemplateMutation['saveTemplate']> {
  const sdk = getSharedGraphQLSdkWithClient()
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
  spaceKey?: string,
): Promise<RegenerateTemplatePreviewMutation['regenerateTemplatePreview']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const variables: RegenerateTemplatePreviewMutationVariables = { templatePath, spaceKey }
  const result = await sdk.RegenerateTemplatePreview(variables)
  return result.regenerateTemplatePreview
}
