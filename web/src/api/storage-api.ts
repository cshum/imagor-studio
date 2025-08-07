import type {
  CreateFolderMutation,
  CreateFolderMutationVariables,
  DeleteFileMutation,
  DeleteFileMutationVariables,
  ListFilesQuery,
  ListFilesQueryVariables,
  SortOption,
  SortOrder,
  StatFileQuery,
  StatFileQueryVariables,
  UploadFileMutation,
  UploadFileMutationVariables,
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
 * Upload a file
 */
export async function uploadFile(
  path: string,
  file: File,
): Promise<UploadFileMutation['uploadFile']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: UploadFileMutationVariables = {
    path,
    content: file,
  }
  const result = await sdk.UploadFile(variables)
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
