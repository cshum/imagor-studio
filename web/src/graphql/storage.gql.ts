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
    thumbnailUrls {
      grid
      preview
      full
      original
      meta
    }
  }
`)

// Queries
export const ListFilesQuery = gql(`
  query ListFiles(
    $path: String!
    $offset: Int
    $limit: Int
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

// Storage Status Query
export const STORAGE_STATUS = gql(`
  query StorageStatus {
    storageStatus {
      configured
      type
      restartRequired
      lastUpdated
      isOverriddenByConfig
      fileConfig {
        baseDir
        mkdirPermissions
        writePermissions
      }
      s3Config {
        bucket
        region
        endpoint
        baseDir
      }
    }
  }
`)

// Configure File Storage Mutation
export const CONFIGURE_FILE_STORAGE = gql(`
  mutation ConfigureFileStorage($input: FileStorageInput!) {
    configureFileStorage(input: $input) {
      success
      restartRequired
      timestamp
      message
    }
  }
`)

// Configure S3 Storage Mutation
export const CONFIGURE_S3_STORAGE = gql(`
  mutation ConfigureS3Storage($input: S3StorageInput!) {
    configureS3Storage(input: $input) {
      success
      restartRequired
      timestamp
      message
    }
  }
`)

// Test Storage Configuration Mutation
export const TEST_STORAGE_CONFIG = gql(`
  mutation TestStorageConfig($input: StorageConfigInput!) {
    testStorageConfig(input: $input) {
      success
      message
      details
    }
  }
`)
