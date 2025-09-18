/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'

export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never
}
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  Upload: { input: File; output: File }
}

export type ChangePasswordInput = {
  currentPassword: InputMaybe<Scalars['String']['input']>
  newPassword: Scalars['String']['input']
}

export type CreateUserInput = {
  displayName: Scalars['String']['input']
  password: Scalars['String']['input']
  role: Scalars['String']['input']
  username: Scalars['String']['input']
}

export type ExternalImagorConfig = {
  __typename?: 'ExternalImagorConfig'
  baseUrl: Scalars['String']['output']
  hasSecret: Scalars['Boolean']['output']
  signerTruncate: Scalars['Int']['output']
  signerType: ImagorSignerType
  unsafe: Scalars['Boolean']['output']
}

export type ExternalImagorInput = {
  baseUrl: Scalars['String']['input']
  secret: InputMaybe<Scalars['String']['input']>
  signerTruncate: InputMaybe<Scalars['Int']['input']>
  signerType: InputMaybe<ImagorSignerType>
  unsafe: InputMaybe<Scalars['Boolean']['input']>
}

export type FileItem = {
  __typename?: 'FileItem'
  isDirectory: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  path: Scalars['String']['output']
  size: Scalars['Int']['output']
  thumbnailUrls: Maybe<ThumbnailUrls>
}

export type FileList = {
  __typename?: 'FileList'
  items: Array<FileItem>
  totalCount: Scalars['Int']['output']
}

export type FileStat = {
  __typename?: 'FileStat'
  etag: Maybe<Scalars['String']['output']>
  isDirectory: Scalars['Boolean']['output']
  modifiedTime: Scalars['String']['output']
  name: Scalars['String']['output']
  path: Scalars['String']['output']
  size: Scalars['Int']['output']
  thumbnailUrls: Maybe<ThumbnailUrls>
}

export type FileStorageConfig = {
  __typename?: 'FileStorageConfig'
  baseDir: Scalars['String']['output']
  mkdirPermissions: Scalars['String']['output']
  writePermissions: Scalars['String']['output']
}

export type FileStorageInput = {
  baseDir: Scalars['String']['input']
  mkdirPermissions: InputMaybe<Scalars['String']['input']>
  writePermissions: InputMaybe<Scalars['String']['input']>
}

export type ImagorConfigResult = {
  __typename?: 'ImagorConfigResult'
  message: Maybe<Scalars['String']['output']>
  restartRequired: Scalars['Boolean']['output']
  success: Scalars['Boolean']['output']
  timestamp: Scalars['String']['output']
}

export type ImagorFilterInput = {
  args: Scalars['String']['input']
  name: Scalars['String']['input']
}

export type ImagorMode = 'EMBEDDED' | 'EXTERNAL'

export type ImagorParamsInput = {
  cropBottom: InputMaybe<Scalars['Float']['input']>
  cropLeft: InputMaybe<Scalars['Float']['input']>
  cropRight: InputMaybe<Scalars['Float']['input']>
  cropTop: InputMaybe<Scalars['Float']['input']>
  filters: InputMaybe<Array<ImagorFilterInput>>
  fitIn: InputMaybe<Scalars['Boolean']['input']>
  hAlign: InputMaybe<Scalars['String']['input']>
  hFlip: InputMaybe<Scalars['Boolean']['input']>
  height: InputMaybe<Scalars['Int']['input']>
  paddingBottom: InputMaybe<Scalars['Int']['input']>
  paddingLeft: InputMaybe<Scalars['Int']['input']>
  paddingRight: InputMaybe<Scalars['Int']['input']>
  paddingTop: InputMaybe<Scalars['Int']['input']>
  smart: InputMaybe<Scalars['Boolean']['input']>
  stretch: InputMaybe<Scalars['Boolean']['input']>
  trim: InputMaybe<Scalars['Boolean']['input']>
  trimBy: InputMaybe<Scalars['String']['input']>
  trimTolerance: InputMaybe<Scalars['Int']['input']>
  vAlign: InputMaybe<Scalars['String']['input']>
  vFlip: InputMaybe<Scalars['Boolean']['input']>
  width: InputMaybe<Scalars['Int']['input']>
}

export type ImagorSignerType = 'SHA1' | 'SHA256' | 'SHA512'

export type ImagorStatus = {
  __typename?: 'ImagorStatus'
  configured: Scalars['Boolean']['output']
  externalConfig: Maybe<ExternalImagorConfig>
  isOverriddenByConfig: Scalars['Boolean']['output']
  lastUpdated: Maybe<Scalars['String']['output']>
  mode: Maybe<Scalars['String']['output']>
  restartRequired: Scalars['Boolean']['output']
}

export type Mutation = {
  __typename?: 'Mutation'
  changePassword: Scalars['Boolean']['output']
  configureEmbeddedImagor: ImagorConfigResult
  configureExternalImagor: ImagorConfigResult
  configureFileStorage: StorageConfigResult
  configureS3Storage: StorageConfigResult
  createFolder: Scalars['Boolean']['output']
  createUser: User
  deactivateAccount: Scalars['Boolean']['output']
  deleteFile: Scalars['Boolean']['output']
  deleteSystemRegistry: Scalars['Boolean']['output']
  deleteUserRegistry: Scalars['Boolean']['output']
  generateImagorUrl: Scalars['String']['output']
  setSystemRegistry: Array<SystemRegistry>
  setUserRegistry: Array<UserRegistry>
  testStorageConfig: StorageTestResult
  updateProfile: User
  uploadFile: Scalars['Boolean']['output']
}

export type MutationChangePasswordArgs = {
  input: ChangePasswordInput
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationConfigureExternalImagorArgs = {
  input: ExternalImagorInput
}

export type MutationConfigureFileStorageArgs = {
  input: FileStorageInput
}

export type MutationConfigureS3StorageArgs = {
  input: S3StorageInput
}

export type MutationCreateFolderArgs = {
  path: Scalars['String']['input']
}

export type MutationCreateUserArgs = {
  input: CreateUserInput
}

export type MutationDeactivateAccountArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationDeleteFileArgs = {
  path: Scalars['String']['input']
}

export type MutationDeleteSystemRegistryArgs = {
  key?: InputMaybe<Scalars['String']['input']>
  keys?: InputMaybe<Array<Scalars['String']['input']>>
}

export type MutationDeleteUserRegistryArgs = {
  key?: InputMaybe<Scalars['String']['input']>
  keys?: InputMaybe<Array<Scalars['String']['input']>>
  ownerID?: InputMaybe<Scalars['String']['input']>
}

export type MutationGenerateImagorUrlArgs = {
  galleryKey: Scalars['String']['input']
  imageKey: Scalars['String']['input']
  params: ImagorParamsInput
}

export type MutationSetSystemRegistryArgs = {
  entries?: InputMaybe<Array<RegistryEntryInput>>
  entry?: InputMaybe<RegistryEntryInput>
}

export type MutationSetUserRegistryArgs = {
  entries?: InputMaybe<Array<RegistryEntryInput>>
  entry?: InputMaybe<RegistryEntryInput>
  ownerID?: InputMaybe<Scalars['String']['input']>
}

export type MutationTestStorageConfigArgs = {
  input: StorageConfigInput
}

export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationUploadFileArgs = {
  content: Scalars['Upload']['input']
  path: Scalars['String']['input']
}

export type Query = {
  __typename?: 'Query'
  getSystemRegistry: Array<SystemRegistry>
  getUserRegistry: Array<UserRegistry>
  imagorStatus: ImagorStatus
  listFiles: FileList
  listSystemRegistry: Array<SystemRegistry>
  listUserRegistry: Array<UserRegistry>
  me: Maybe<User>
  statFile: Maybe<FileStat>
  storageStatus: StorageStatus
  user: Maybe<User>
  users: UserList
}

export type QueryGetSystemRegistryArgs = {
  key?: InputMaybe<Scalars['String']['input']>
  keys?: InputMaybe<Array<Scalars['String']['input']>>
}

export type QueryGetUserRegistryArgs = {
  key?: InputMaybe<Scalars['String']['input']>
  keys?: InputMaybe<Array<Scalars['String']['input']>>
  ownerID?: InputMaybe<Scalars['String']['input']>
}

export type QueryListFilesArgs = {
  extensions?: InputMaybe<Scalars['String']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  onlyFiles?: InputMaybe<Scalars['Boolean']['input']>
  onlyFolders?: InputMaybe<Scalars['Boolean']['input']>
  path: Scalars['String']['input']
  showHidden?: InputMaybe<Scalars['Boolean']['input']>
  sortBy?: InputMaybe<SortOption>
  sortOrder?: InputMaybe<SortOrder>
}

export type QueryListSystemRegistryArgs = {
  prefix?: InputMaybe<Scalars['String']['input']>
}

export type QueryListUserRegistryArgs = {
  ownerID?: InputMaybe<Scalars['String']['input']>
  prefix?: InputMaybe<Scalars['String']['input']>
}

export type QueryStatFileArgs = {
  path: Scalars['String']['input']
}

export type QueryUserArgs = {
  id: Scalars['ID']['input']
}

export type QueryUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type RegistryEntryInput = {
  isEncrypted: Scalars['Boolean']['input']
  key: Scalars['String']['input']
  value: Scalars['String']['input']
}

export type S3StorageConfig = {
  __typename?: 'S3StorageConfig'
  baseDir: Maybe<Scalars['String']['output']>
  bucket: Scalars['String']['output']
  endpoint: Maybe<Scalars['String']['output']>
  forcePathStyle: Maybe<Scalars['Boolean']['output']>
  region: Maybe<Scalars['String']['output']>
}

export type S3StorageInput = {
  accessKeyId: InputMaybe<Scalars['String']['input']>
  baseDir: InputMaybe<Scalars['String']['input']>
  bucket: Scalars['String']['input']
  endpoint: InputMaybe<Scalars['String']['input']>
  forcePathStyle: InputMaybe<Scalars['Boolean']['input']>
  region: InputMaybe<Scalars['String']['input']>
  secretAccessKey: InputMaybe<Scalars['String']['input']>
  sessionToken: InputMaybe<Scalars['String']['input']>
}

export type SortOption = 'MODIFIED_TIME' | 'NAME' | 'SIZE'

export type SortOrder = 'ASC' | 'DESC'

export type StorageConfigInput = {
  fileConfig: InputMaybe<FileStorageInput>
  s3Config: InputMaybe<S3StorageInput>
  type: StorageType
}

export type StorageConfigResult = {
  __typename?: 'StorageConfigResult'
  message: Maybe<Scalars['String']['output']>
  restartRequired: Scalars['Boolean']['output']
  success: Scalars['Boolean']['output']
  timestamp: Scalars['String']['output']
}

export type StorageStatus = {
  __typename?: 'StorageStatus'
  configured: Scalars['Boolean']['output']
  fileConfig: Maybe<FileStorageConfig>
  isOverriddenByConfig: Scalars['Boolean']['output']
  lastUpdated: Maybe<Scalars['String']['output']>
  restartRequired: Scalars['Boolean']['output']
  s3Config: Maybe<S3StorageConfig>
  type: Maybe<Scalars['String']['output']>
}

export type StorageTestResult = {
  __typename?: 'StorageTestResult'
  details: Maybe<Scalars['String']['output']>
  message: Scalars['String']['output']
  success: Scalars['Boolean']['output']
}

export type StorageType = 'FILE' | 'S3'

export type SystemRegistry = {
  __typename?: 'SystemRegistry'
  isEncrypted: Scalars['Boolean']['output']
  isOverriddenByConfig: Scalars['Boolean']['output']
  key: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type ThumbnailUrls = {
  __typename?: 'ThumbnailUrls'
  full: Maybe<Scalars['String']['output']>
  grid: Maybe<Scalars['String']['output']>
  meta: Maybe<Scalars['String']['output']>
  original: Maybe<Scalars['String']['output']>
  preview: Maybe<Scalars['String']['output']>
}

export type UpdateProfileInput = {
  displayName: InputMaybe<Scalars['String']['input']>
  username: InputMaybe<Scalars['String']['input']>
}

export type User = {
  __typename?: 'User'
  createdAt: Scalars['String']['output']
  displayName: Scalars['String']['output']
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  role: Scalars['String']['output']
  updatedAt: Scalars['String']['output']
  username: Scalars['String']['output']
}

export type UserList = {
  __typename?: 'UserList'
  items: Array<User>
  totalCount: Scalars['Int']['output']
}

export type UserRegistry = {
  __typename?: 'UserRegistry'
  isEncrypted: Scalars['Boolean']['output']
  key: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type ImagorStatusQueryVariables = Exact<{ [key: string]: never }>

export type ImagorStatusQuery = {
  __typename?: 'Query'
  imagorStatus: {
    __typename?: 'ImagorStatus'
    configured: boolean
    mode: string | null
    restartRequired: boolean
    lastUpdated: string | null
    isOverriddenByConfig: boolean
    externalConfig: {
      __typename?: 'ExternalImagorConfig'
      baseUrl: string
      hasSecret: boolean
      unsafe: boolean
      signerType: ImagorSignerType
      signerTruncate: number
    } | null
  }
}

export type ConfigureEmbeddedImagorMutationVariables = Exact<{ [key: string]: never }>

export type ConfigureEmbeddedImagorMutation = {
  __typename?: 'Mutation'
  configureEmbeddedImagor: {
    __typename?: 'ImagorConfigResult'
    success: boolean
    restartRequired: boolean
    timestamp: string
    message: string | null
  }
}

export type ConfigureExternalImagorMutationVariables = Exact<{
  input: ExternalImagorInput
}>

export type ConfigureExternalImagorMutation = {
  __typename?: 'Mutation'
  configureExternalImagor: {
    __typename?: 'ImagorConfigResult'
    success: boolean
    restartRequired: boolean
    timestamp: string
    message: string | null
  }
}

export type GenerateImagorUrlMutationVariables = Exact<{
  galleryKey: Scalars['String']['input']
  imageKey: Scalars['String']['input']
  params: ImagorParamsInput
}>

export type GenerateImagorUrlMutation = { __typename?: 'Mutation'; generateImagorUrl: string }

export type RegistryInfoFragment = {
  __typename?: 'UserRegistry'
  key: string
  value: string
  isEncrypted: boolean
}

export type SystemRegistryInfoFragment = {
  __typename?: 'SystemRegistry'
  key: string
  value: string
  isEncrypted: boolean
  isOverriddenByConfig: boolean
}

export type ListUserRegistryQueryVariables = Exact<{
  prefix?: InputMaybe<Scalars['String']['input']>
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type ListUserRegistryQuery = {
  __typename?: 'Query'
  listUserRegistry: Array<{
    __typename?: 'UserRegistry'
    key: string
    value: string
    isEncrypted: boolean
  }>
}

export type GetUserRegistryQueryVariables = Exact<{
  key?: InputMaybe<Scalars['String']['input']>
  keys?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type GetUserRegistryQuery = {
  __typename?: 'Query'
  getUserRegistry: Array<{
    __typename?: 'UserRegistry'
    key: string
    value: string
    isEncrypted: boolean
  }>
}

export type ListSystemRegistryQueryVariables = Exact<{
  prefix?: InputMaybe<Scalars['String']['input']>
}>

export type ListSystemRegistryQuery = {
  __typename?: 'Query'
  listSystemRegistry: Array<{
    __typename?: 'SystemRegistry'
    key: string
    value: string
    isEncrypted: boolean
    isOverriddenByConfig: boolean
  }>
}

export type GetSystemRegistryQueryVariables = Exact<{
  key?: InputMaybe<Scalars['String']['input']>
  keys?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>
}>

export type GetSystemRegistryQuery = {
  __typename?: 'Query'
  getSystemRegistry: Array<{
    __typename?: 'SystemRegistry'
    key: string
    value: string
    isEncrypted: boolean
    isOverriddenByConfig: boolean
  }>
}

export type SetUserRegistryMutationVariables = Exact<{
  entry?: InputMaybe<RegistryEntryInput>
  entries?: InputMaybe<Array<RegistryEntryInput> | RegistryEntryInput>
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type SetUserRegistryMutation = {
  __typename?: 'Mutation'
  setUserRegistry: Array<{
    __typename?: 'UserRegistry'
    key: string
    value: string
    isEncrypted: boolean
  }>
}

export type DeleteUserRegistryMutationVariables = Exact<{
  key: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type DeleteUserRegistryMutation = { __typename?: 'Mutation'; deleteUserRegistry: boolean }

export type SetSystemRegistryMutationVariables = Exact<{
  entry?: InputMaybe<RegistryEntryInput>
  entries?: InputMaybe<Array<RegistryEntryInput> | RegistryEntryInput>
}>

export type SetSystemRegistryMutation = {
  __typename?: 'Mutation'
  setSystemRegistry: Array<{
    __typename?: 'SystemRegistry'
    key: string
    value: string
    isEncrypted: boolean
    isOverriddenByConfig: boolean
  }>
}

export type DeleteSystemRegistryMutationVariables = Exact<{
  key: Scalars['String']['input']
}>

export type DeleteSystemRegistryMutation = {
  __typename?: 'Mutation'
  deleteSystemRegistry: boolean
}

export type FileInfoFragment = {
  __typename?: 'FileItem'
  name: string
  path: string
  size: number
  isDirectory: boolean
  thumbnailUrls: {
    __typename?: 'ThumbnailUrls'
    grid: string | null
    preview: string | null
    full: string | null
    original: string | null
    meta: string | null
  } | null
}

export type FileStatInfoFragment = {
  __typename?: 'FileStat'
  name: string
  path: string
  size: number
  isDirectory: boolean
  modifiedTime: string
  etag: string | null
  thumbnailUrls: {
    __typename?: 'ThumbnailUrls'
    grid: string | null
    preview: string | null
    full: string | null
    original: string | null
    meta: string | null
  } | null
}

export type ListFilesQueryVariables = Exact<{
  path: Scalars['String']['input']
  offset?: InputMaybe<Scalars['Int']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  onlyFiles?: InputMaybe<Scalars['Boolean']['input']>
  onlyFolders?: InputMaybe<Scalars['Boolean']['input']>
  extensions?: InputMaybe<Scalars['String']['input']>
  showHidden?: InputMaybe<Scalars['Boolean']['input']>
  sortBy?: InputMaybe<SortOption>
  sortOrder?: InputMaybe<SortOrder>
}>

export type ListFilesQuery = {
  __typename?: 'Query'
  listFiles: {
    __typename?: 'FileList'
    totalCount: number
    items: Array<{
      __typename?: 'FileItem'
      name: string
      path: string
      size: number
      isDirectory: boolean
      thumbnailUrls: {
        __typename?: 'ThumbnailUrls'
        grid: string | null
        preview: string | null
        full: string | null
        original: string | null
        meta: string | null
      } | null
    }>
  }
}

export type StatFileQueryVariables = Exact<{
  path: Scalars['String']['input']
}>

export type StatFileQuery = {
  __typename?: 'Query'
  statFile: {
    __typename?: 'FileStat'
    name: string
    path: string
    size: number
    isDirectory: boolean
    modifiedTime: string
    etag: string | null
    thumbnailUrls: {
      __typename?: 'ThumbnailUrls'
      grid: string | null
      preview: string | null
      full: string | null
      original: string | null
      meta: string | null
    } | null
  } | null
}

export type UploadFileMutationVariables = Exact<{
  path: Scalars['String']['input']
  content: Scalars['Upload']['input']
}>

export type UploadFileMutation = { __typename?: 'Mutation'; uploadFile: boolean }

export type DeleteFileMutationVariables = Exact<{
  path: Scalars['String']['input']
}>

export type DeleteFileMutation = { __typename?: 'Mutation'; deleteFile: boolean }

export type CreateFolderMutationVariables = Exact<{
  path: Scalars['String']['input']
}>

export type CreateFolderMutation = { __typename?: 'Mutation'; createFolder: boolean }

export type StorageStatusQueryVariables = Exact<{ [key: string]: never }>

export type StorageStatusQuery = {
  __typename?: 'Query'
  storageStatus: {
    __typename?: 'StorageStatus'
    configured: boolean
    type: string | null
    restartRequired: boolean
    lastUpdated: string | null
    isOverriddenByConfig: boolean
    fileConfig: {
      __typename?: 'FileStorageConfig'
      baseDir: string
      mkdirPermissions: string
      writePermissions: string
    } | null
    s3Config: {
      __typename?: 'S3StorageConfig'
      bucket: string
      region: string | null
      endpoint: string | null
      forcePathStyle: boolean | null
      baseDir: string | null
    } | null
  }
}

export type ConfigureFileStorageMutationVariables = Exact<{
  input: FileStorageInput
}>

export type ConfigureFileStorageMutation = {
  __typename?: 'Mutation'
  configureFileStorage: {
    __typename?: 'StorageConfigResult'
    success: boolean
    restartRequired: boolean
    timestamp: string
    message: string | null
  }
}

export type ConfigureS3StorageMutationVariables = Exact<{
  input: S3StorageInput
}>

export type ConfigureS3StorageMutation = {
  __typename?: 'Mutation'
  configureS3Storage: {
    __typename?: 'StorageConfigResult'
    success: boolean
    restartRequired: boolean
    timestamp: string
    message: string | null
  }
}

export type TestStorageConfigMutationVariables = Exact<{
  input: StorageConfigInput
}>

export type TestStorageConfigMutation = {
  __typename?: 'Mutation'
  testStorageConfig: {
    __typename?: 'StorageTestResult'
    success: boolean
    message: string
    details: string | null
  }
}

export type UserInfoFragment = {
  __typename?: 'User'
  id: string
  displayName: string
  username: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type MeQueryVariables = Exact<{ [key: string]: never }>

export type MeQuery = {
  __typename?: 'Query'
  me: {
    __typename?: 'User'
    id: string
    displayName: string
    username: string
    role: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  } | null
}

export type GetUserQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type GetUserQuery = {
  __typename?: 'Query'
  user: {
    __typename?: 'User'
    id: string
    displayName: string
    username: string
    role: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  } | null
}

export type ListUsersQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
}>

export type ListUsersQuery = {
  __typename?: 'Query'
  users: {
    __typename?: 'UserList'
    totalCount: number
    items: Array<{
      __typename?: 'User'
      id: string
      displayName: string
      username: string
      role: string
      isActive: boolean
      createdAt: string
      updatedAt: string
    }>
  }
}

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type UpdateProfileMutation = {
  __typename?: 'Mutation'
  updateProfile: {
    __typename?: 'User'
    id: string
    displayName: string
    username: string
    role: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

export type ChangePasswordMutationVariables = Exact<{
  input: ChangePasswordInput
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type ChangePasswordMutation = { __typename?: 'Mutation'; changePassword: boolean }

export type DeactivateAccountMutationVariables = Exact<{
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type DeactivateAccountMutation = { __typename?: 'Mutation'; deactivateAccount: boolean }

export type CreateUserMutationVariables = Exact<{
  input: CreateUserInput
}>

export type CreateUserMutation = {
  __typename?: 'Mutation'
  createUser: {
    __typename?: 'User'
    id: string
    displayName: string
    username: string
    role: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

export const RegistryInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'UserRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RegistryInfoFragment, unknown>
export const SystemRegistryInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SystemRegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'SystemRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SystemRegistryInfoFragment, unknown>
export const FileInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FileInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'FileItem' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'size' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'thumbnailUrls' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'grid' } },
                { kind: 'Field', name: { kind: 'Name', value: 'preview' } },
                { kind: 'Field', name: { kind: 'Name', value: 'full' } },
                { kind: 'Field', name: { kind: 'Name', value: 'original' } },
                { kind: 'Field', name: { kind: 'Name', value: 'meta' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<FileInfoFragment, unknown>
export const FileStatInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FileStatInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'FileStat' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'size' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'modifiedTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'etag' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'thumbnailUrls' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'grid' } },
                { kind: 'Field', name: { kind: 'Name', value: 'preview' } },
                { kind: 'Field', name: { kind: 'Name', value: 'full' } },
                { kind: 'Field', name: { kind: 'Name', value: 'original' } },
                { kind: 'Field', name: { kind: 'Name', value: 'meta' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<FileStatInfoFragment, unknown>
export const UserInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'User' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'username' } },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UserInfoFragment, unknown>
export const ImagorStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ImagorStatus' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'imagorStatus' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'configured' } },
                { kind: 'Field', name: { kind: 'Name', value: 'mode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'restartRequired' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUpdated' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'externalConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'baseUrl' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hasSecret' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'unsafe' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'signerType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'signerTruncate' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ImagorStatusQuery, ImagorStatusQueryVariables>
export const ConfigureEmbeddedImagorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ConfigureEmbeddedImagor' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configureEmbeddedImagor' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'restartRequired' } },
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ConfigureEmbeddedImagorMutation,
  ConfigureEmbeddedImagorMutationVariables
>
export const ConfigureExternalImagorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ConfigureExternalImagor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ExternalImagorInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configureExternalImagor' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'restartRequired' } },
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ConfigureExternalImagorMutation,
  ConfigureExternalImagorMutationVariables
>
export const GenerateImagorUrlDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'GenerateImagorUrl' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'galleryKey' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'imageKey' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ImagorParamsInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'generateImagorUrl' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'galleryKey' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'galleryKey' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'imageKey' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'imageKey' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GenerateImagorUrlMutation, GenerateImagorUrlMutationVariables>
export const ListUserRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListUserRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'prefix' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listUserRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'prefix' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'prefix' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ownerID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'RegistryInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'UserRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListUserRegistryQuery, ListUserRegistryQueryVariables>
export const GetUserRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetUserRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'keys' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'getUserRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'keys' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'keys' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ownerID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'RegistryInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'UserRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetUserRegistryQuery, GetUserRegistryQueryVariables>
export const ListSystemRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListSystemRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'prefix' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listSystemRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'prefix' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'prefix' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'SystemRegistryInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SystemRegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'SystemRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListSystemRegistryQuery, ListSystemRegistryQueryVariables>
export const GetSystemRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetSystemRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'keys' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'getSystemRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'keys' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'keys' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'SystemRegistryInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SystemRegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'SystemRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetSystemRegistryQuery, GetSystemRegistryQueryVariables>
export const SetUserRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetUserRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'entry' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'RegistryEntryInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'entries' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'RegistryEntryInput' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setUserRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'entry' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'entry' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'entries' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'entries' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ownerID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'RegistryInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'UserRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SetUserRegistryMutation, SetUserRegistryMutationVariables>
export const DeleteUserRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteUserRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteUserRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ownerID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ownerID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteUserRegistryMutation, DeleteUserRegistryMutationVariables>
export const SetSystemRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetSystemRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'entry' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'RegistryEntryInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'entries' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'RegistryEntryInput' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setSystemRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'entry' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'entry' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'entries' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'entries' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'SystemRegistryInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'SystemRegistryInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'SystemRegistry' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SetSystemRegistryMutation, SetSystemRegistryMutationVariables>
export const DeleteSystemRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteSystemRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteSystemRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteSystemRegistryMutation, DeleteSystemRegistryMutationVariables>
export const ListFilesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListFiles' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'onlyFiles' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'onlyFolders' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'extensions' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'showHidden' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sortBy' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'SortOption' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sortOrder' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'SortOrder' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'listFiles' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'offset' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'onlyFiles' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'onlyFiles' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'onlyFolders' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'onlyFolders' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'extensions' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'extensions' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'showHidden' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'showHidden' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sortBy' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sortBy' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sortOrder' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sortOrder' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'FragmentSpread', name: { kind: 'Name', value: 'FileInfo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FileInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'FileItem' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'size' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'thumbnailUrls' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'grid' } },
                { kind: 'Field', name: { kind: 'Name', value: 'preview' } },
                { kind: 'Field', name: { kind: 'Name', value: 'full' } },
                { kind: 'Field', name: { kind: 'Name', value: 'original' } },
                { kind: 'Field', name: { kind: 'Name', value: 'meta' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListFilesQuery, ListFilesQueryVariables>
export const StatFileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StatFile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'statFile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'FileStatInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FileStatInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'FileStat' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'size' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'modifiedTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'etag' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'thumbnailUrls' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'grid' } },
                { kind: 'Field', name: { kind: 'Name', value: 'preview' } },
                { kind: 'Field', name: { kind: 'Name', value: 'full' } },
                { kind: 'Field', name: { kind: 'Name', value: 'original' } },
                { kind: 'Field', name: { kind: 'Name', value: 'meta' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StatFileQuery, StatFileQueryVariables>
export const UploadFileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UploadFile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'content' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Upload' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'uploadFile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'content' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'content' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UploadFileMutation, UploadFileMutationVariables>
export const DeleteFileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteFile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteFile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteFileMutation, DeleteFileMutationVariables>
export const CreateFolderDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateFolder' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createFolder' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateFolderMutation, CreateFolderMutationVariables>
export const StorageStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StorageStatus' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'storageStatus' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'configured' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'restartRequired' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUpdated' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'fileConfig' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'baseDir' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'mkdirPermissions' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'writePermissions' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 's3Config' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'bucket' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'region' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'endpoint' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'forcePathStyle' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'baseDir' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StorageStatusQuery, StorageStatusQueryVariables>
export const ConfigureFileStorageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ConfigureFileStorage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'FileStorageInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configureFileStorage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'restartRequired' } },
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ConfigureFileStorageMutation, ConfigureFileStorageMutationVariables>
export const ConfigureS3StorageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ConfigureS3Storage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'S3StorageInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configureS3Storage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'restartRequired' } },
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ConfigureS3StorageMutation, ConfigureS3StorageMutationVariables>
export const TestStorageConfigDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TestStorageConfig' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'StorageConfigInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'testStorageConfig' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'details' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TestStorageConfigMutation, TestStorageConfigMutationVariables>
export const MeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Me' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'me' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'UserInfo' } }],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'User' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'username' } },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MeQuery, MeQueryVariables>
export const GetUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetUser' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'user' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'UserInfo' } }],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'User' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'username' } },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetUserQuery, GetUserQueryVariables>
export const ListUsersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListUsers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '0' },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '0' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'users' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'offset' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'FragmentSpread', name: { kind: 'Name', value: 'UserInfo' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'User' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'username' } },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListUsersQuery, ListUsersQueryVariables>
export const UpdateProfileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateProfile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateProfileInput' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateProfile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'UserInfo' } }],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'User' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'username' } },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>
export const ChangePasswordDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ChangePassword' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ChangePasswordInput' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'changePassword' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>
export const DeactivateAccountDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeactivateAccount' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deactivateAccount' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeactivateAccountMutation, DeactivateAccountMutationVariables>
export const CreateUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateUser' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateUserInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'UserInfo' } }],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'UserInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'User' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'username' } },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateUserMutation, CreateUserMutationVariables>
