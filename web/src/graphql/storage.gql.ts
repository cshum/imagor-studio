import { gql } from '@/generated/gql'

export const LIST_FILES = gql(`
  query ListFiles(
    $path: String!
    $spaceID: String
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
      spaceID: $spaceID
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
  query StatFile($path: String!, $spaceID: String) {
    statFile(path: $path, spaceID: $spaceID) {
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
  mutation UploadFile($path: String!, $spaceID: String, $content: Upload!) {
    uploadFile(path: $path, spaceID: $spaceID, content: $content)
  }
`)

export const RequestUploadMutation = gql(`
  mutation RequestUpload(
    $path: String!
    $spaceID: String
    $contentType: String!
    $sizeBytes: Int!
  ) {
    requestUpload(
      path: $path
      spaceID: $spaceID
      contentType: $contentType
      sizeBytes: $sizeBytes
    ) {
      uploadURL
      expiresAt
      requiredHeaders {
        name
        value
      }
    }
  }
`)

export const CompleteUploadMutation = gql(`
  mutation CompleteUpload($path: String!, $spaceID: String) {
    completeUpload(path: $path, spaceID: $spaceID)
  }
`)

export const DELETE_FILE = gql(`
  mutation DeleteFile($path: String!, $spaceID: String) {
    deleteFile(path: $path, spaceID: $spaceID)
  }
`)

export const CREATE_FOLDER = gql(`
  mutation CreateFolder($path: String!, $spaceID: String) {
    createFolder(path: $path, spaceID: $spaceID)
  }
`)

export const COPY_FILE = gql(`
  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceID: String) {
    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)
  }
`)

export const MOVE_FILE = gql(`
  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceID: String) {
    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)
  }
`)

export const STORAGE_STATUS = gql(`
  query StorageStatus {
    storageStatus {
      configured
      supportsPresignedUpload
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
      code
    }
  }
`)

export const BEGIN_STORAGE_UPLOAD_PROBE = gql(`
  mutation BeginStorageUploadProbe(
    $input: StorageConfigInput!
    $contentType: String!
    $sizeBytes: Int!
  ) {
    beginStorageUploadProbe(
      input: $input
      contentType: $contentType
      sizeBytes: $sizeBytes
    ) {
      probePath
      uploadURL
      expiresAt
    }
  }
`)

export const COMPLETE_STORAGE_UPLOAD_PROBE = gql(`
  mutation CompleteStorageUploadProbe(
    $input: StorageConfigInput!
    $probePath: String!
    $expectedContent: String!
  ) {
    completeStorageUploadProbe(
      input: $input
      probePath: $probePath
      expectedContent: $expectedContent
    ) {
      success
      message
      details
      code
    }
  }
`)

export const SAVE_TEMPLATE = gql(`
  mutation SaveTemplate($input: SaveTemplateInput!, $spaceID: String) {
    saveTemplate(input: $input, spaceID: $spaceID) {
      success
      templatePath
      message
    }
  }
`)

export const REGENERATE_TEMPLATE_PREVIEW = gql(`
  mutation RegenerateTemplatePreview($templatePath: String!, $spaceID: String) {
    regenerateTemplatePreview(templatePath: $templatePath, spaceID: $spaceID)
  }
`)
