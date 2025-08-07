import { gql } from '@/generated/gql'

// Fragments
export const FileFragment = gql(`
  fragment FileInfo on File {
    name
    path
    size
    isDirectory
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

export const MetadataFragment = gql(`
  fragment MetadataInfo on Metadata {
    key
    value
    createdAt
    updatedAt
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

export const ListMetadataQuery = gql(`
  query ListMetadata($prefix: String) {
    listMetadata(prefix: $prefix) {
      ...MetadataInfo
    }
  }
`)

export const GetMetadataQuery = gql(`
  query GetMetadata($key: String!) {
    getMetadata(key: $key) {
      ...MetadataInfo
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

export const SetMetadataMutation = gql(`
  mutation SetMetadata($key: String!, $value: String!) {
    setMetadata(key: $key, value: $value) {
      ...MetadataInfo
    }
  }
`)

export const DeleteMetadataMutation = gql(`
  mutation DeleteMetadata($key: String!) {
    deleteMetadata(key: $key)
  }
`)
