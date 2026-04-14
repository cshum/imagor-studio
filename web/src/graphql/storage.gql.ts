import { gql } from '@/generated/gql'

export const LIST_FILES = gql(`
  query ListFiles(
    $path: String!
    $spaceKey: String
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
      spaceKey: $spaceKey
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
        modifiedTime
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
  query StatFile($path: String!, $spaceKey: String) {
    statFile(path: $path, spaceKey: $spaceKey) {
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
  mutation UploadFile($path: String!, $spaceKey: String, $content: Upload!) {
    uploadFile(path: $path, spaceKey: $spaceKey, content: $content)
  }
`)

export const DELETE_FILE = gql(`
  mutation DeleteFile($path: String!, $spaceKey: String) {
    deleteFile(path: $path, spaceKey: $spaceKey)
  }
`)

export const CREATE_FOLDER = gql(`
  mutation CreateFolder($path: String!, $spaceKey: String) {
    createFolder(path: $path, spaceKey: $spaceKey)
  }
`)

export const COPY_FILE = gql(`
  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceKey: String) {
    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceKey: $spaceKey)
  }
`)

export const MOVE_FILE = gql(`
  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceKey: String) {
    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceKey: $spaceKey)
  }
`)

export const STORAGE_STATUS = gql(`
  query StorageStatus {
    storageStatus {
      configured
      type
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
      timestamp
      message
    }
  }
`)

export const CONFIGURE_S3_STORAGE = gql(`
  mutation ConfigureS3Storage($input: S3StorageInput!) {
    configureS3Storage(input: $input) {
      success
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

export const SAVE_TEMPLATE = gql(`
  mutation SaveTemplate($input: SaveTemplateInput!) {
    saveTemplate(input: $input) {
      success
      templatePath
      previewPath
      message
    }
  }
`)

export const REGENERATE_TEMPLATE_PREVIEW = gql(`
  mutation RegenerateTemplatePreview($templatePath: String!) {
    regenerateTemplatePreview(templatePath: $templatePath)
  }
`)
