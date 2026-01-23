import { gql } from '@/generated/gql'

export const LIST_FILES = gql(`
  query ListFiles(
    $path: String!
    $offset: Int
    $limit: Int
    $onlyFiles: Boolean
    $onlyFolders: Boolean
    $extensions: String
    $showHidden: Boolean
    $sortBy: SortOption
    $sortOrder: SortOrder
  ) {
    listFiles(
      path: $path
      offset: $offset
      limit: $limit
      onlyFiles: $onlyFiles
      onlyFolders: $onlyFolders
      extensions: $extensions
      showHidden: $showHidden
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      items {
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
      totalCount
    }
  }
`)

export const STAT_FILE = gql(`
  query StatFile($path: String!) {
    statFile(path: $path) {
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
  }
`)

export const UploadFileMutation = gql(`
  mutation UploadFile($path: String!, $content: Upload!) {
    uploadFile(path: $path, content: $content)
  }
`)

export const DELETE_FILE = gql(`
  mutation DeleteFile($path: String!) {
    deleteFile(path: $path)
  }
`)

export const CREATE_FOLDER = gql(`
  mutation CreateFolder($path: String!) {
    createFolder(path: $path)
  }
`)

export const COPY_FILE = gql(`
  mutation CopyFile($sourcePath: String!, $destPath: String!) {
    copyFile(sourcePath: $sourcePath, destPath: $destPath)
  }
`)

export const MOVE_FILE = gql(`
  mutation MoveFile($sourcePath: String!, $destPath: String!) {
    moveFile(sourcePath: $sourcePath, destPath: $destPath)
  }
`)

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
        forcePathStyle
        baseDir
      }
    }
  }
`)

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

export const TEST_STORAGE_CONFIG = gql(`
  mutation TestStorageConfig($input: StorageConfigInput!) {
    testStorageConfig(input: $input) {
      success
      message
      details
    }
  }
`)
