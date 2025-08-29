import { gql } from '@/generated/gql'

// Fragments
export const FileFragment = gql(`
  fragment FileInfo on FileItem {
    name
    path
    size
    isDirectory
    thumbnailUrls {
      grid
      preview
      full
      original
      meta
    }
  }
`)

export const FileStatFragment = gql(`
  fragment FileStatInfo on FileStat {
    name
    path
    size
    isDirectory
    modifiedTime
    etag
  }
`)

// Queries
export const ListFilesQuery = gql(`
  query ListFiles(
    $path: String!
    $offset: Int!
    $limit: Int!
    $onlyFiles: Boolean
    $onlyFolders: Boolean
    $sortBy: SortOption
    $sortOrder: SortOrder
  ) {
    listFiles(
      path: $path
      offset: $offset
      limit: $limit
      onlyFiles: $onlyFiles
      onlyFolders: $onlyFolders
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      items {
        ...FileInfo
      }
      totalCount
    }
  }
`)

export const StatFileQuery = gql(`
  query StatFile($path: String!) {
    statFile(path: $path) {
      ...FileStatInfo
    }
  }
`)

// Mutations
export const UploadFileMutation = gql(`
  mutation UploadFile($path: String!, $content: Upload!) {
    uploadFile(path: $path, content: $content)
  }
`)

export const DeleteFileMutation = gql(`
  mutation DeleteFile($path: String!) {
    deleteFile(path: $path)
  }
`)

export const CreateFolderMutation = gql(`
  mutation CreateFolder($path: String!) {
    createFolder(path: $path)
  }
`)
