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
  SortOption,
  SortOrder,
  StatFileQuery,
  StatFileQueryVariables,
  StorageStatusQuery,
  TestStorageConfigMutation,
  TestStorageConfigMutationVariables,
  UploadFileMutation,
} from '@/generated/graphql'
import { getSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

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
export async function statFile(path: string): Promise<StatFileQuery['statFile']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: StatFileQueryVariables = { path }
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
): Promise<UploadFileMutation['uploadFile']> {
  const { UploadFileMutation } = await import('@/graphql/storage.gql')
  const { uploadSingleFile } = await import('@/lib/graphql-upload')

  interface UploadFileResult {
    uploadFile: boolean
  }

  const result = await uploadSingleFile<UploadFileResult>(
    UploadFileMutation,
    { path, content: file },
    'content',
    file,
    signal,
  )

  return result.uploadFile
}

/**
 * Delete a file or folder
 */
export async function deleteFile(path: string): Promise<DeleteFileMutation['deleteFile']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteFileMutationVariables = { path }
  const result = await sdk.DeleteFile(variables)
  return result.deleteFile
}

/**
 * Create a new folder
 */
export async function createFolder(path: string): Promise<CreateFolderMutation['createFolder']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: CreateFolderMutationVariables = { path }
  const result = await sdk.CreateFolder(variables)
  return result.createFolder
}

/**
 * List files with pagination helper
 */
export async function listFilesPaginated(params: {
  path: string
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

/**
 * Copy a file or folder
 */
export async function copyFile(
  sourcePath: string,
  destPath: string,
): Promise<CopyFileMutation['copyFile']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: CopyFileMutationVariables = { sourcePath, destPath }
  const result = await sdk.CopyFile(variables)
  return result.copyFile
}

/**
 * Move/rename a file or folder
 */
export async function moveFile(
  sourcePath: string,
  destPath: string,
): Promise<MoveFileMutation['moveFile']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: MoveFileMutationVariables = { sourcePath, destPath }
  const result = await sdk.MoveFile(variables)
  return result.moveFile
}
