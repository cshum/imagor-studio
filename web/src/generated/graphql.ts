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

export type AuthProvider = {
  __typename?: 'AuthProvider'
  email: Maybe<Scalars['String']['output']>
  linkedAt: Scalars['String']['output']
  provider: Scalars['String']['output']
}

export type BillingSession = {
  __typename?: 'BillingSession'
  url: Scalars['String']['output']
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

export type DimensionMode = 'ADAPTIVE' | 'PREDEFINED'

export type DimensionsInput = {
  height: Scalars['Int']['input']
  width: Scalars['Int']['input']
}

export type EmailChangeRequestResult = {
  __typename?: 'EmailChangeRequestResult'
  email: Scalars['String']['output']
  verificationRequired: Scalars['Boolean']['output']
}

export type FileItem = {
  __typename?: 'FileItem'
  isDirectory: Scalars['Boolean']['output']
  modifiedTime: Scalars['String']['output']
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

export type ImagorConfig = {
  __typename?: 'ImagorConfig'
  hasSecret: Scalars['Boolean']['output']
  signerTruncate: Scalars['Int']['output']
  signerType: ImagorSignerType
}

export type ImagorConfigResult = {
  __typename?: 'ImagorConfigResult'
  message: Maybe<Scalars['String']['output']>
  success: Scalars['Boolean']['output']
  timestamp: Scalars['String']['output']
}

export type ImagorFilterInput = {
  args: Scalars['String']['input']
  name: Scalars['String']['input']
}

export type ImagorInput = {
  secret: InputMaybe<Scalars['String']['input']>
  signerTruncate: InputMaybe<Scalars['Int']['input']>
  signerType: InputMaybe<ImagorSignerType>
}

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
  config: Maybe<ImagorConfig>
  configured: Scalars['Boolean']['output']
  isOverriddenByConfig: Scalars['Boolean']['output']
  lastUpdated: Maybe<Scalars['String']['output']>
}

export type LicenseStatus = {
  __typename?: 'LicenseStatus'
  activatedAt: Maybe<Scalars['String']['output']>
  email: Scalars['String']['output']
  isLicensed: Scalars['Boolean']['output']
  isOverriddenByConfig: Scalars['Boolean']['output']
  licenseType: Scalars['String']['output']
  maskedLicenseKey: Maybe<Scalars['String']['output']>
  message: Scalars['String']['output']
  supportMessage: Maybe<Scalars['String']['output']>
}

export type Mutation = {
  __typename?: 'Mutation'
  addOrgMember: OrgMember
  addOrgMemberByEmail: OrgMember
  addSpaceMember: SpaceMember
  beginStorageUploadProbe: StorageUploadProbe
  changePassword: Scalars['Boolean']['output']
  completeStorageUploadProbe: StorageTestResult
  completeUpload: Scalars['Boolean']['output']
  configureFileStorage: StorageConfigResult
  configureImagor: ImagorConfigResult
  configureS3Storage: StorageConfigResult
  copyFile: Scalars['Boolean']['output']
  createBillingPortalSession: BillingSession
  createCheckoutSession: BillingSession
  createFolder: Scalars['Boolean']['output']
  createSpace: Space
  createUser: User
  deactivateAccount: Scalars['Boolean']['output']
  deleteFile: Scalars['Boolean']['output']
  deleteOrganization: Scalars['Boolean']['output']
  deleteSpace: Scalars['Boolean']['output']
  deleteSpaceRegistry: Scalars['Boolean']['output']
  deleteSystemRegistry: Scalars['Boolean']['output']
  deleteUserRegistry: Scalars['Boolean']['output']
  generateImagorUrl: Scalars['String']['output']
  generateImagorUrlFromTemplate: Scalars['String']['output']
  inviteSpaceMember: SpaceInviteResult
  leaveOrganization: Scalars['Boolean']['output']
  leaveSpace: Scalars['Boolean']['output']
  moveFile: Scalars['Boolean']['output']
  reactivateAccount: Scalars['Boolean']['output']
  regenerateTemplatePreview: Scalars['Boolean']['output']
  removeOrgMember: Scalars['Boolean']['output']
  removeSpaceMember: Scalars['Boolean']['output']
  requestEmailChange: EmailChangeRequestResult
  requestUpload: PresignedUpload
  saveTemplate: TemplateResult
  setSpaceRegistry: Array<UserRegistry>
  setSystemRegistry: Array<SystemRegistry>
  setUserRegistry: Array<UserRegistry>
  testStorageConfig: StorageTestResult
  transferOrganizationOwnership: Organization
  unlinkAuthProvider: Scalars['Boolean']['output']
  updateOrgMemberRole: OrgMember
  updateProfile: User
  updateSpace: Space
  updateSpaceMemberRole: SpaceMember
  uploadFile: Scalars['Boolean']['output']
}

export type MutationAddOrgMemberArgs = {
  role: OrgMemberAssignableRole
  username: Scalars['String']['input']
}

export type MutationAddOrgMemberByEmailArgs = {
  email: Scalars['String']['input']
  role: OrgMemberAssignableRole
}

export type MutationAddSpaceMemberArgs = {
  role: SpaceMemberAssignableRole
  spaceID: Scalars['String']['input']
  userId: Scalars['ID']['input']
}

export type MutationBeginStorageUploadProbeArgs = {
  contentType: Scalars['String']['input']
  input: StorageConfigInput
  sizeBytes: Scalars['Int']['input']
}

export type MutationChangePasswordArgs = {
  input: ChangePasswordInput
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationCompleteStorageUploadProbeArgs = {
  expectedContent: Scalars['String']['input']
  input: StorageConfigInput
  probePath: Scalars['String']['input']
}

export type MutationCompleteUploadArgs = {
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationConfigureFileStorageArgs = {
  input: FileStorageInput
}

export type MutationConfigureImagorArgs = {
  input: ImagorInput
}

export type MutationConfigureS3StorageArgs = {
  input: S3StorageInput
}

export type MutationCopyFileArgs = {
  destPath: Scalars['String']['input']
  sourcePath: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationCreateBillingPortalSessionArgs = {
  returnURL: Scalars['String']['input']
}

export type MutationCreateCheckoutSessionArgs = {
  cancelURL: Scalars['String']['input']
  plan: Scalars['String']['input']
  successURL: Scalars['String']['input']
}

export type MutationCreateFolderArgs = {
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationCreateSpaceArgs = {
  input: SpaceInput
}

export type MutationCreateUserArgs = {
  input: CreateUserInput
}

export type MutationDeactivateAccountArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationDeleteFileArgs = {
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationDeleteSpaceArgs = {
  key: Scalars['String']['input']
}

export type MutationDeleteSpaceRegistryArgs = {
  keys?: InputMaybe<Array<Scalars['String']['input']>>
  spaceID: Scalars['String']['input']
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
  imagePath: Scalars['String']['input']
  params: ImagorParamsInput
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationGenerateImagorUrlFromTemplateArgs = {
  appendFilters?: InputMaybe<Array<ImagorFilterInput>>
  contextPath?: InputMaybe<Array<Scalars['String']['input']>>
  forPreview?: InputMaybe<Scalars['Boolean']['input']>
  imagePath?: InputMaybe<Scalars['String']['input']>
  previewMaxDimensions?: InputMaybe<DimensionsInput>
  skipLayerId?: InputMaybe<Scalars['String']['input']>
  spaceID?: InputMaybe<Scalars['String']['input']>
  templateJson: Scalars['String']['input']
}

export type MutationInviteSpaceMemberArgs = {
  email: Scalars['String']['input']
  role: SpaceMemberAssignableRole
  spaceID: Scalars['String']['input']
}

export type MutationLeaveSpaceArgs = {
  spaceID: Scalars['String']['input']
}

export type MutationMoveFileArgs = {
  destPath: Scalars['String']['input']
  sourcePath: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationReactivateAccountArgs = {
  userId: Scalars['ID']['input']
}

export type MutationRegenerateTemplatePreviewArgs = {
  spaceID?: InputMaybe<Scalars['String']['input']>
  templatePath: Scalars['String']['input']
}

export type MutationRemoveOrgMemberArgs = {
  userId: Scalars['ID']['input']
}

export type MutationRemoveSpaceMemberArgs = {
  spaceID: Scalars['String']['input']
  userId: Scalars['ID']['input']
}

export type MutationRequestEmailChangeArgs = {
  email: Scalars['String']['input']
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationRequestUploadArgs = {
  contentType: Scalars['String']['input']
  path: Scalars['String']['input']
  sizeBytes: Scalars['Int']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationSaveTemplateArgs = {
  input: SaveTemplateInput
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type MutationSetSpaceRegistryArgs = {
  entries?: InputMaybe<Array<RegistryEntryInput>>
  spaceID: Scalars['String']['input']
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

export type MutationTransferOrganizationOwnershipArgs = {
  userId: Scalars['ID']['input']
}

export type MutationUnlinkAuthProviderArgs = {
  provider: Scalars['String']['input']
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationUpdateOrgMemberRoleArgs = {
  role: OrgMemberAssignableRole
  userId: Scalars['ID']['input']
}

export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput
  userId?: InputMaybe<Scalars['ID']['input']>
}

export type MutationUpdateSpaceArgs = {
  input: SpaceInput
  key: Scalars['String']['input']
}

export type MutationUpdateSpaceMemberRoleArgs = {
  role: SpaceMemberAssignableRole
  spaceID: Scalars['String']['input']
  userId: Scalars['ID']['input']
}

export type MutationUploadFileArgs = {
  content: Scalars['Upload']['input']
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type OrgMember = {
  __typename?: 'OrgMember'
  avatarUrl: Maybe<Scalars['String']['output']>
  createdAt: Scalars['String']['output']
  displayName: Scalars['String']['output']
  email: Maybe<Scalars['String']['output']>
  role: OrgMemberRole
  userId: Scalars['ID']['output']
  username: Scalars['String']['output']
}

export type OrgMemberAssignableRole = 'admin' | 'member'

export type OrgMemberRole = 'admin' | 'member' | 'owner'

export type Organization = {
  __typename?: 'Organization'
  createdAt: Scalars['String']['output']
  currentUserRole: OrgMemberRole
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  ownerUserId: Scalars['String']['output']
  plan: Scalars['String']['output']
  planStatus: Scalars['String']['output']
  slug: Scalars['String']['output']
  updatedAt: Scalars['String']['output']
}

export type PresignedUpload = {
  __typename?: 'PresignedUpload'
  expiresAt: Scalars['String']['output']
  requiredHeaders: Array<UploadHeader>
  uploadURL: Scalars['String']['output']
}

export type Query = {
  __typename?: 'Query'
  getSystemRegistry: Array<SystemRegistry>
  getUserRegistry: Array<UserRegistry>
  imagorStatus: ImagorStatus
  licenseStatus: LicenseStatus
  listFiles: FileList
  listSystemRegistry: Array<SystemRegistry>
  listUserRegistry: Array<UserRegistry>
  me: Maybe<User>
  myOrganization: Maybe<Organization>
  orgMembers: Array<OrgMember>
  space: Maybe<Space>
  spaceInvitations: Array<SpaceInvitation>
  spaceKeyExists: Scalars['Boolean']['output']
  spaceMembers: Array<SpaceMember>
  spaceRegistry: Array<UserRegistry>
  spaces: Array<Space>
  statFile: Maybe<FileStat>
  storageStatus: StorageStatus
  usageSummary: UsageSummary
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
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type QueryListSystemRegistryArgs = {
  prefix?: InputMaybe<Scalars['String']['input']>
}

export type QueryListUserRegistryArgs = {
  ownerID?: InputMaybe<Scalars['String']['input']>
  prefix?: InputMaybe<Scalars['String']['input']>
}

export type QuerySpaceArgs = {
  key: Scalars['String']['input']
}

export type QuerySpaceInvitationsArgs = {
  spaceID: Scalars['String']['input']
}

export type QuerySpaceKeyExistsArgs = {
  key: Scalars['String']['input']
}

export type QuerySpaceMembersArgs = {
  spaceID: Scalars['String']['input']
}

export type QuerySpaceRegistryArgs = {
  keys?: InputMaybe<Array<Scalars['String']['input']>>
  spaceID: Scalars['String']['input']
}

export type QueryStatFileArgs = {
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}

export type QueryUserArgs = {
  id: Scalars['ID']['input']
}

export type QueryUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  offset?: InputMaybe<Scalars['Int']['input']>
  search?: InputMaybe<Scalars['String']['input']>
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

export type SaveTemplateInput = {
  description: InputMaybe<Scalars['String']['input']>
  dimensionMode: DimensionMode
  name: Scalars['String']['input']
  overwrite: InputMaybe<Scalars['Boolean']['input']>
  savePath: Scalars['String']['input']
  sourceImagePath: Scalars['String']['input']
  templateJson: Scalars['String']['input']
}

export type SortOption = 'MODIFIED_TIME' | 'NAME' | 'SIZE'

export type SortOrder = 'ASC' | 'DESC'

export type Space = {
  __typename?: 'Space'
  bucket: Scalars['String']['output']
  canDelete: Scalars['Boolean']['output']
  canLeave: Scalars['Boolean']['output']
  canManage: Scalars['Boolean']['output']
  customDomain: Scalars['String']['output']
  customDomainVerified: Scalars['Boolean']['output']
  endpoint: Scalars['String']['output']
  id: Scalars['ID']['output']
  imagorCORSOrigins: Scalars['String']['output']
  isShared: Scalars['Boolean']['output']
  key: Scalars['String']['output']
  name: Scalars['String']['output']
  orgId: Scalars['ID']['output']
  prefix: Scalars['String']['output']
  processingUsageCount: Maybe<Scalars['Int']['output']>
  region: Scalars['String']['output']
  signerAlgorithm: Scalars['String']['output']
  signerTruncate: Scalars['Int']['output']
  storageMode: Scalars['String']['output']
  storageType: Scalars['String']['output']
  storageUsageBytes: Maybe<Scalars['Int']['output']>
  suspended: Scalars['Boolean']['output']
  updatedAt: Scalars['String']['output']
  usePathStyle: Scalars['Boolean']['output']
}

export type SpaceInput = {
  accessKeyId: InputMaybe<Scalars['String']['input']>
  bucket: InputMaybe<Scalars['String']['input']>
  customDomain: InputMaybe<Scalars['String']['input']>
  endpoint: InputMaybe<Scalars['String']['input']>
  imagorCORSOrigins: InputMaybe<Scalars['String']['input']>
  imagorSecret: InputMaybe<Scalars['String']['input']>
  isShared: InputMaybe<Scalars['Boolean']['input']>
  key: Scalars['String']['input']
  name: Scalars['String']['input']
  prefix: InputMaybe<Scalars['String']['input']>
  region: InputMaybe<Scalars['String']['input']>
  secretKey: InputMaybe<Scalars['String']['input']>
  signerAlgorithm: InputMaybe<Scalars['String']['input']>
  signerTruncate: InputMaybe<Scalars['Int']['input']>
  storageMode: InputMaybe<Scalars['String']['input']>
  storageType: InputMaybe<Scalars['String']['input']>
  usePathStyle: InputMaybe<Scalars['Boolean']['input']>
}

export type SpaceInvitation = {
  __typename?: 'SpaceInvitation'
  createdAt: Scalars['String']['output']
  email: Scalars['String']['output']
  expiresAt: Scalars['String']['output']
  id: Scalars['ID']['output']
  role: SpaceMemberAssignableRole
}

export type SpaceInviteResult = {
  __typename?: 'SpaceInviteResult'
  invitation: Maybe<SpaceInvitation>
  member: Maybe<SpaceMember>
  status: Scalars['String']['output']
}

export type SpaceMember = {
  __typename?: 'SpaceMember'
  avatarUrl: Maybe<Scalars['String']['output']>
  canChangeRole: Scalars['Boolean']['output']
  canRemove: Scalars['Boolean']['output']
  createdAt: Scalars['String']['output']
  displayName: Scalars['String']['output']
  email: Maybe<Scalars['String']['output']>
  role: SpaceMemberRole
  roleSource: SpaceMemberRoleSource
  userId: Scalars['ID']['output']
  username: Scalars['String']['output']
}

export type SpaceMemberAssignableRole = 'admin' | 'member'

export type SpaceMemberRole = 'admin' | 'member' | 'owner'

export type SpaceMemberRoleSource = 'organization' | 'space'

export type SpaceUsage = {
  __typename?: 'SpaceUsage'
  key: Scalars['String']['output']
  name: Scalars['String']['output']
  processingUsageCount: Maybe<Scalars['Int']['output']>
  spaceId: Scalars['ID']['output']
  storageUsageBytes: Maybe<Scalars['Int']['output']>
}

export type StorageConfigInput = {
  fileConfig: InputMaybe<FileStorageInput>
  s3Config: InputMaybe<S3StorageInput>
  type: StorageType
}

export type StorageConfigResult = {
  __typename?: 'StorageConfigResult'
  message: Maybe<Scalars['String']['output']>
  success: Scalars['Boolean']['output']
  timestamp: Scalars['String']['output']
}

export type StorageStatus = {
  __typename?: 'StorageStatus'
  configured: Scalars['Boolean']['output']
  fileConfig: Maybe<FileStorageConfig>
  isOverriddenByConfig: Scalars['Boolean']['output']
  lastUpdated: Maybe<Scalars['String']['output']>
  s3Config: Maybe<S3StorageConfig>
  supportsPresignedUpload: Scalars['Boolean']['output']
  type: Maybe<Scalars['String']['output']>
}

export type StorageTestResult = {
  __typename?: 'StorageTestResult'
  code: Maybe<Scalars['String']['output']>
  details: Maybe<Scalars['String']['output']>
  message: Scalars['String']['output']
  success: Scalars['Boolean']['output']
}

export type StorageType = 'FILE' | 'S3'

export type StorageUploadProbe = {
  __typename?: 'StorageUploadProbe'
  expiresAt: Scalars['String']['output']
  probePath: Scalars['String']['output']
  uploadURL: Scalars['String']['output']
}

export type SystemRegistry = {
  __typename?: 'SystemRegistry'
  isEncrypted: Scalars['Boolean']['output']
  isOverriddenByConfig: Scalars['Boolean']['output']
  key: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type TemplateResult = {
  __typename?: 'TemplateResult'
  message: Maybe<Scalars['String']['output']>
  previewPath: Maybe<Scalars['String']['output']>
  success: Scalars['Boolean']['output']
  templatePath: Scalars['String']['output']
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

export type UploadHeader = {
  __typename?: 'UploadHeader'
  name: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type UsageSummary = {
  __typename?: 'UsageSummary'
  maxSpaces: Maybe<Scalars['Int']['output']>
  periodEnd: Maybe<Scalars['String']['output']>
  periodStart: Maybe<Scalars['String']['output']>
  spaces: Array<SpaceUsage>
  storageLimitGB: Maybe<Scalars['Int']['output']>
  transformsLimit: Maybe<Scalars['Int']['output']>
  usedHostedStorageBytes: Maybe<Scalars['Int']['output']>
  usedSpaces: Scalars['Int']['output']
  usedTransforms: Maybe<Scalars['Int']['output']>
}

export type User = {
  __typename?: 'User'
  authProviders: Array<AuthProvider>
  avatarUrl: Maybe<Scalars['String']['output']>
  createdAt: Scalars['String']['output']
  displayName: Scalars['String']['output']
  email: Maybe<Scalars['String']['output']>
  emailVerified: Scalars['Boolean']['output']
  hasPassword: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  pendingEmail: Maybe<Scalars['String']['output']>
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
    lastUpdated: string | null
    isOverriddenByConfig: boolean
    config: {
      __typename?: 'ImagorConfig'
      hasSecret: boolean
      signerType: ImagorSignerType
      signerTruncate: number
    } | null
  }
}

export type ConfigureImagorMutationVariables = Exact<{
  input: ImagorInput
}>

export type ConfigureImagorMutation = {
  __typename?: 'Mutation'
  configureImagor: {
    __typename?: 'ImagorConfigResult'
    success: boolean
    timestamp: string
    message: string | null
  }
}

export type GenerateImagorUrlMutationVariables = Exact<{
  imagePath: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
  params: ImagorParamsInput
}>

export type GenerateImagorUrlMutation = { __typename?: 'Mutation'; generateImagorUrl: string }

export type GenerateImagorUrlFromTemplateMutationVariables = Exact<{
  templateJson: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
  contextPath?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>
  forPreview?: InputMaybe<Scalars['Boolean']['input']>
  previewMaxDimensions?: InputMaybe<DimensionsInput>
  skipLayerId?: InputMaybe<Scalars['String']['input']>
  appendFilters?: InputMaybe<Array<ImagorFilterInput> | ImagorFilterInput>
}>

export type GenerateImagorUrlFromTemplateMutation = {
  __typename?: 'Mutation'
  generateImagorUrlFromTemplate: string
}

export type MyOrganizationQueryVariables = Exact<{ [key: string]: never }>

export type MyOrganizationQuery = {
  __typename?: 'Query'
  myOrganization: {
    __typename?: 'Organization'
    id: string
    name: string
    slug: string
    ownerUserId: string
    currentUserRole: OrgMemberRole
    plan: string
    planStatus: string
    createdAt: string
    updatedAt: string
  } | null
}

export type ListSpacesQueryVariables = Exact<{ [key: string]: never }>

export type ListSpacesQuery = {
  __typename?: 'Query'
  spaces: Array<{
    __typename?: 'Space'
    id: string
    orgId: string
    key: string
    name: string
    storageUsageBytes: number | null
    processingUsageCount: number | null
    storageMode: string
    storageType: string
    bucket: string
    prefix: string
    region: string
    endpoint: string
    usePathStyle: boolean
    customDomain: string
    customDomainVerified: boolean
    suspended: boolean
    isShared: boolean
    signerAlgorithm: string
    signerTruncate: number
    imagorCORSOrigins: string
    canManage: boolean
    canDelete: boolean
    canLeave: boolean
    updatedAt: string
  }>
}

export type GetUsageSummaryQueryVariables = Exact<{ [key: string]: never }>

export type GetUsageSummaryQuery = {
  __typename?: 'Query'
  usageSummary: {
    __typename?: 'UsageSummary'
    usedSpaces: number
    maxSpaces: number | null
    usedHostedStorageBytes: number | null
    storageLimitGB: number | null
    usedTransforms: number | null
    transformsLimit: number | null
    periodStart: string | null
    periodEnd: string | null
  }
}

export type CreateCheckoutSessionMutationVariables = Exact<{
  plan: Scalars['String']['input']
  successURL: Scalars['String']['input']
  cancelURL: Scalars['String']['input']
}>

export type CreateCheckoutSessionMutation = {
  __typename?: 'Mutation'
  createCheckoutSession: { __typename?: 'BillingSession'; url: string }
}

export type CreateBillingPortalSessionMutationVariables = Exact<{
  returnURL: Scalars['String']['input']
}>

export type CreateBillingPortalSessionMutation = {
  __typename?: 'Mutation'
  createBillingPortalSession: { __typename?: 'BillingSession'; url: string }
}

export type GetSpaceQueryVariables = Exact<{
  key: Scalars['String']['input']
}>

export type GetSpaceQuery = {
  __typename?: 'Query'
  space: {
    __typename?: 'Space'
    id: string
    orgId: string
    key: string
    name: string
    storageUsageBytes: number | null
    storageMode: string
    storageType: string
    bucket: string
    prefix: string
    region: string
    endpoint: string
    usePathStyle: boolean
    customDomain: string
    customDomainVerified: boolean
    suspended: boolean
    isShared: boolean
    signerAlgorithm: string
    signerTruncate: number
    imagorCORSOrigins: string
    canManage: boolean
    canDelete: boolean
    canLeave: boolean
    updatedAt: string
  } | null
}

export type CreateSpaceMutationVariables = Exact<{
  input: SpaceInput
}>

export type CreateSpaceMutation = {
  __typename?: 'Mutation'
  createSpace: {
    __typename?: 'Space'
    orgId: string
    key: string
    name: string
    storageMode: string
    storageType: string
    bucket: string
    prefix: string
    region: string
    endpoint: string
    usePathStyle: boolean
    customDomain: string
    suspended: boolean
    isShared: boolean
    signerAlgorithm: string
    signerTruncate: number
    imagorCORSOrigins: string
    canManage: boolean
    canDelete: boolean
    canLeave: boolean
    updatedAt: string
  }
}

export type UpdateSpaceMutationVariables = Exact<{
  key: Scalars['String']['input']
  input: SpaceInput
}>

export type UpdateSpaceMutation = {
  __typename?: 'Mutation'
  updateSpace: {
    __typename?: 'Space'
    orgId: string
    key: string
    name: string
    storageMode: string
    storageType: string
    bucket: string
    prefix: string
    region: string
    endpoint: string
    usePathStyle: boolean
    customDomain: string
    suspended: boolean
    isShared: boolean
    signerAlgorithm: string
    signerTruncate: number
    imagorCORSOrigins: string
    canManage: boolean
    canDelete: boolean
    canLeave: boolean
    updatedAt: string
  }
}

export type DeleteSpaceMutationVariables = Exact<{
  key: Scalars['String']['input']
}>

export type DeleteSpaceMutation = { __typename?: 'Mutation'; deleteSpace: boolean }

export type GetSpaceRegistryQueryVariables = Exact<{
  spaceID: Scalars['String']['input']
  keys?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>
}>

export type GetSpaceRegistryQuery = {
  __typename?: 'Query'
  spaceRegistry: Array<{
    __typename?: 'UserRegistry'
    key: string
    value: string
    isEncrypted: boolean
  }>
}

export type SetSpaceRegistryMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
  entries?: InputMaybe<Array<RegistryEntryInput> | RegistryEntryInput>
}>

export type SetSpaceRegistryMutation = {
  __typename?: 'Mutation'
  setSpaceRegistry: Array<{
    __typename?: 'UserRegistry'
    key: string
    value: string
    isEncrypted: boolean
  }>
}

export type DeleteSpaceRegistryMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
  keys: Array<Scalars['String']['input']> | Scalars['String']['input']
}>

export type DeleteSpaceRegistryMutation = { __typename?: 'Mutation'; deleteSpaceRegistry: boolean }

export type SpaceKeyExistsQueryVariables = Exact<{
  key: Scalars['String']['input']
}>

export type SpaceKeyExistsQuery = { __typename?: 'Query'; spaceKeyExists: boolean }

export type ListOrgMembersQueryVariables = Exact<{ [key: string]: never }>

export type ListOrgMembersQuery = {
  __typename?: 'Query'
  orgMembers: Array<{
    __typename?: 'OrgMember'
    userId: string
    username: string
    displayName: string
    email: string | null
    avatarUrl: string | null
    role: OrgMemberRole
    createdAt: string
  }>
}

export type ListSpaceMembersQueryVariables = Exact<{
  spaceID: Scalars['String']['input']
}>

export type ListSpaceMembersQuery = {
  __typename?: 'Query'
  spaceMembers: Array<{
    __typename?: 'SpaceMember'
    userId: string
    username: string
    displayName: string
    email: string | null
    avatarUrl: string | null
    role: SpaceMemberRole
    roleSource: SpaceMemberRoleSource
    canChangeRole: boolean
    canRemove: boolean
    createdAt: string
  }>
}

export type ListSpaceInvitationsQueryVariables = Exact<{
  spaceID: Scalars['String']['input']
}>

export type ListSpaceInvitationsQuery = {
  __typename?: 'Query'
  spaceInvitations: Array<{
    __typename?: 'SpaceInvitation'
    id: string
    email: string
    role: SpaceMemberAssignableRole
    createdAt: string
    expiresAt: string
  }>
}

export type AddOrgMemberMutationVariables = Exact<{
  username: Scalars['String']['input']
  role: OrgMemberAssignableRole
}>

export type AddOrgMemberMutation = {
  __typename?: 'Mutation'
  addOrgMember: {
    __typename?: 'OrgMember'
    userId: string
    username: string
    displayName: string
    role: OrgMemberRole
    createdAt: string
  }
}

export type AddOrgMemberByEmailMutationVariables = Exact<{
  email: Scalars['String']['input']
  role: OrgMemberAssignableRole
}>

export type AddOrgMemberByEmailMutation = {
  __typename?: 'Mutation'
  addOrgMemberByEmail: {
    __typename?: 'OrgMember'
    userId: string
    username: string
    displayName: string
    role: OrgMemberRole
    createdAt: string
  }
}

export type AddSpaceMemberMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
  userId: Scalars['ID']['input']
  role: SpaceMemberAssignableRole
}>

export type AddSpaceMemberMutation = {
  __typename?: 'Mutation'
  addSpaceMember: {
    __typename?: 'SpaceMember'
    userId: string
    username: string
    displayName: string
    role: SpaceMemberRole
    createdAt: string
  }
}

export type InviteSpaceMemberMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
  email: Scalars['String']['input']
  role: SpaceMemberAssignableRole
}>

export type InviteSpaceMemberMutation = {
  __typename?: 'Mutation'
  inviteSpaceMember: {
    __typename?: 'SpaceInviteResult'
    status: string
    member: {
      __typename?: 'SpaceMember'
      userId: string
      username: string
      displayName: string
      role: SpaceMemberRole
      createdAt: string
    } | null
    invitation: {
      __typename?: 'SpaceInvitation'
      id: string
      email: string
      role: SpaceMemberAssignableRole
      createdAt: string
      expiresAt: string
    } | null
  }
}

export type RemoveOrgMemberMutationVariables = Exact<{
  userId: Scalars['ID']['input']
}>

export type RemoveOrgMemberMutation = { __typename?: 'Mutation'; removeOrgMember: boolean }

export type LeaveOrganizationMutationVariables = Exact<{ [key: string]: never }>

export type LeaveOrganizationMutation = { __typename?: 'Mutation'; leaveOrganization: boolean }

export type DeleteOrganizationMutationVariables = Exact<{ [key: string]: never }>

export type DeleteOrganizationMutation = { __typename?: 'Mutation'; deleteOrganization: boolean }

export type RemoveSpaceMemberMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
  userId: Scalars['ID']['input']
}>

export type RemoveSpaceMemberMutation = { __typename?: 'Mutation'; removeSpaceMember: boolean }

export type LeaveSpaceMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
}>

export type LeaveSpaceMutation = { __typename?: 'Mutation'; leaveSpace: boolean }

export type UpdateOrgMemberRoleMutationVariables = Exact<{
  userId: Scalars['ID']['input']
  role: OrgMemberAssignableRole
}>

export type UpdateOrgMemberRoleMutation = {
  __typename?: 'Mutation'
  updateOrgMemberRole: {
    __typename?: 'OrgMember'
    userId: string
    username: string
    displayName: string
    role: OrgMemberRole
    createdAt: string
  }
}

export type TransferOrganizationOwnershipMutationVariables = Exact<{
  userId: Scalars['ID']['input']
}>

export type TransferOrganizationOwnershipMutation = {
  __typename?: 'Mutation'
  transferOrganizationOwnership: {
    __typename?: 'Organization'
    id: string
    ownerUserId: string
    updatedAt: string
  }
}

export type UpdateSpaceMemberRoleMutationVariables = Exact<{
  spaceID: Scalars['String']['input']
  userId: Scalars['ID']['input']
  role: SpaceMemberAssignableRole
}>

export type UpdateSpaceMemberRoleMutation = {
  __typename?: 'Mutation'
  updateSpaceMemberRole: {
    __typename?: 'SpaceMember'
    userId: string
    username: string
    displayName: string
    role: SpaceMemberRole
    createdAt: string
  }
}

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

export type LicenseStatusQueryVariables = Exact<{ [key: string]: never }>

export type LicenseStatusQuery = {
  __typename?: 'Query'
  licenseStatus: {
    __typename?: 'LicenseStatus'
    isLicensed: boolean
    licenseType: string
    email: string
    message: string
    isOverriddenByConfig: boolean
    supportMessage: string | null
    maskedLicenseKey: string | null
    activatedAt: string | null
  }
}

export type ListFilesQueryVariables = Exact<{
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
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
      modifiedTime: string
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
  spaceID?: InputMaybe<Scalars['String']['input']>
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
  spaceID?: InputMaybe<Scalars['String']['input']>
  content: Scalars['Upload']['input']
}>

export type UploadFileMutation = { __typename?: 'Mutation'; uploadFile: boolean }

export type RequestUploadMutationVariables = Exact<{
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
  contentType: Scalars['String']['input']
  sizeBytes: Scalars['Int']['input']
}>

export type RequestUploadMutation = {
  __typename?: 'Mutation'
  requestUpload: {
    __typename?: 'PresignedUpload'
    uploadURL: string
    expiresAt: string
    requiredHeaders: Array<{ __typename?: 'UploadHeader'; name: string; value: string }>
  }
}

export type CompleteUploadMutationVariables = Exact<{
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type CompleteUploadMutation = { __typename?: 'Mutation'; completeUpload: boolean }

export type DeleteFileMutationVariables = Exact<{
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type DeleteFileMutation = { __typename?: 'Mutation'; deleteFile: boolean }

export type CreateFolderMutationVariables = Exact<{
  path: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type CreateFolderMutation = { __typename?: 'Mutation'; createFolder: boolean }

export type CopyFileMutationVariables = Exact<{
  sourcePath: Scalars['String']['input']
  destPath: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type CopyFileMutation = { __typename?: 'Mutation'; copyFile: boolean }

export type MoveFileMutationVariables = Exact<{
  sourcePath: Scalars['String']['input']
  destPath: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type MoveFileMutation = { __typename?: 'Mutation'; moveFile: boolean }

export type StorageStatusQueryVariables = Exact<{ [key: string]: never }>

export type StorageStatusQuery = {
  __typename?: 'Query'
  storageStatus: {
    __typename?: 'StorageStatus'
    configured: boolean
    supportsPresignedUpload: boolean
    type: string | null
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
    code: string | null
  }
}

export type BeginStorageUploadProbeMutationVariables = Exact<{
  input: StorageConfigInput
  contentType: Scalars['String']['input']
  sizeBytes: Scalars['Int']['input']
}>

export type BeginStorageUploadProbeMutation = {
  __typename?: 'Mutation'
  beginStorageUploadProbe: {
    __typename?: 'StorageUploadProbe'
    probePath: string
    uploadURL: string
    expiresAt: string
  }
}

export type CompleteStorageUploadProbeMutationVariables = Exact<{
  input: StorageConfigInput
  probePath: Scalars['String']['input']
  expectedContent: Scalars['String']['input']
}>

export type CompleteStorageUploadProbeMutation = {
  __typename?: 'Mutation'
  completeStorageUploadProbe: {
    __typename?: 'StorageTestResult'
    success: boolean
    message: string
    details: string | null
    code: string | null
  }
}

export type SaveTemplateMutationVariables = Exact<{
  input: SaveTemplateInput
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type SaveTemplateMutation = {
  __typename?: 'Mutation'
  saveTemplate: {
    __typename?: 'TemplateResult'
    success: boolean
    templatePath: string
    message: string | null
  }
}

export type RegenerateTemplatePreviewMutationVariables = Exact<{
  templatePath: Scalars['String']['input']
  spaceID?: InputMaybe<Scalars['String']['input']>
}>

export type RegenerateTemplatePreviewMutation = {
  __typename?: 'Mutation'
  regenerateTemplatePreview: boolean
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
  email: string | null
  pendingEmail: string | null
  emailVerified: boolean
  hasPassword: boolean
  avatarUrl: string | null
  authProviders: Array<{
    __typename?: 'AuthProvider'
    provider: string
    email: string | null
    linkedAt: string
  }>
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
    email: string | null
    pendingEmail: string | null
    emailVerified: boolean
    hasPassword: boolean
    avatarUrl: string | null
    authProviders: Array<{
      __typename?: 'AuthProvider'
      provider: string
      email: string | null
      linkedAt: string
    }>
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
    email: string | null
    pendingEmail: string | null
    emailVerified: boolean
    hasPassword: boolean
    avatarUrl: string | null
    authProviders: Array<{
      __typename?: 'AuthProvider'
      provider: string
      email: string | null
      linkedAt: string
    }>
  } | null
}

export type ListUsersQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>
  limit?: InputMaybe<Scalars['Int']['input']>
  search?: InputMaybe<Scalars['String']['input']>
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
      email: string | null
      pendingEmail: string | null
      emailVerified: boolean
      hasPassword: boolean
      avatarUrl: string | null
      authProviders: Array<{
        __typename?: 'AuthProvider'
        provider: string
        email: string | null
        linkedAt: string
      }>
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
    email: string | null
    pendingEmail: string | null
    emailVerified: boolean
    hasPassword: boolean
    avatarUrl: string | null
    authProviders: Array<{
      __typename?: 'AuthProvider'
      provider: string
      email: string | null
      linkedAt: string
    }>
  }
}

export type ChangePasswordMutationVariables = Exact<{
  input: ChangePasswordInput
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type ChangePasswordMutation = { __typename?: 'Mutation'; changePassword: boolean }

export type RequestEmailChangeMutationVariables = Exact<{
  email: Scalars['String']['input']
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type RequestEmailChangeMutation = {
  __typename?: 'Mutation'
  requestEmailChange: {
    __typename?: 'EmailChangeRequestResult'
    email: string
    verificationRequired: boolean
  }
}

export type UnlinkAuthProviderMutationVariables = Exact<{
  provider: Scalars['String']['input']
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type UnlinkAuthProviderMutation = { __typename?: 'Mutation'; unlinkAuthProvider: boolean }

export type DeactivateAccountMutationVariables = Exact<{
  userId?: InputMaybe<Scalars['ID']['input']>
}>

export type DeactivateAccountMutation = { __typename?: 'Mutation'; deactivateAccount: boolean }

export type ReactivateAccountMutationVariables = Exact<{
  userId: Scalars['ID']['input']
}>

export type ReactivateAccountMutation = { __typename?: 'Mutation'; reactivateAccount: boolean }

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
    email: string | null
    pendingEmail: string | null
    emailVerified: boolean
    hasPassword: boolean
    avatarUrl: string | null
    authProviders: Array<{
      __typename?: 'AuthProvider'
      provider: string
      email: string | null
      linkedAt: string
    }>
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
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'pendingEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'emailVerified' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hasPassword' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'authProviders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'linkedAt' } },
              ],
            },
          },
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
                { kind: 'Field', name: { kind: 'Name', value: 'lastUpdated' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'config' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'hasSecret' } },
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
export const ConfigureImagorDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ConfigureImagor' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ImagorInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'configureImagor' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ConfigureImagorMutation, ConfigureImagorMutationVariables>
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'imagePath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
                name: { kind: 'Name', value: 'imagePath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'imagePath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
export const GenerateImagorUrlFromTemplateDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'GenerateImagorUrlFromTemplate' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'templateJson' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'contextPath' } },
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'forPreview' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'previewMaxDimensions' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'DimensionsInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'skipLayerId' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'appendFilters' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ImagorFilterInput' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'generateImagorUrlFromTemplate' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'templateJson' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'templateJson' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'contextPath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'contextPath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'forPreview' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'forPreview' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'previewMaxDimensions' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'previewMaxDimensions' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'skipLayerId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'skipLayerId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'appendFilters' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'appendFilters' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GenerateImagorUrlFromTemplateMutation,
  GenerateImagorUrlFromTemplateMutationVariables
>
export const MyOrganizationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MyOrganization' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myOrganization' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ownerUserId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'currentUserRole' } },
                { kind: 'Field', name: { kind: 'Name', value: 'plan' } },
                { kind: 'Field', name: { kind: 'Name', value: 'planStatus' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MyOrganizationQuery, MyOrganizationQueryVariables>
export const ListSpacesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListSpaces' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'spaces' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'orgId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageUsageBytes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'processingUsageCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageMode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bucket' } },
                { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
                { kind: 'Field', name: { kind: 'Name', value: 'region' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endpoint' } },
                { kind: 'Field', name: { kind: 'Name', value: 'usePathStyle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'customDomain' } },
                { kind: 'Field', name: { kind: 'Name', value: 'customDomainVerified' } },
                { kind: 'Field', name: { kind: 'Name', value: 'suspended' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isShared' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerAlgorithm' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerTruncate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'imagorCORSOrigins' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canManage' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canDelete' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canLeave' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListSpacesQuery, ListSpacesQueryVariables>
export const GetUsageSummaryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetUsageSummary' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'usageSummary' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'usedSpaces' } },
                { kind: 'Field', name: { kind: 'Name', value: 'maxSpaces' } },
                { kind: 'Field', name: { kind: 'Name', value: 'usedHostedStorageBytes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageLimitGB' } },
                { kind: 'Field', name: { kind: 'Name', value: 'usedTransforms' } },
                { kind: 'Field', name: { kind: 'Name', value: 'transformsLimit' } },
                { kind: 'Field', name: { kind: 'Name', value: 'periodStart' } },
                { kind: 'Field', name: { kind: 'Name', value: 'periodEnd' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetUsageSummaryQuery, GetUsageSummaryQueryVariables>
export const CreateCheckoutSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateCheckoutSession' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'plan' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'successURL' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'cancelURL' } },
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
            name: { kind: 'Name', value: 'createCheckoutSession' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'plan' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'plan' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'successURL' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'successURL' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'cancelURL' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'cancelURL' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'Field', name: { kind: 'Name', value: 'url' } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateCheckoutSessionMutation, CreateCheckoutSessionMutationVariables>
export const CreateBillingPortalSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateBillingPortalSession' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'returnURL' } },
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
            name: { kind: 'Name', value: 'createBillingPortalSession' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'returnURL' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'returnURL' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'Field', name: { kind: 'Name', value: 'url' } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateBillingPortalSessionMutation,
  CreateBillingPortalSessionMutationVariables
>
export const GetSpaceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetSpace' },
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
            name: { kind: 'Name', value: 'space' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'orgId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageUsageBytes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageMode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bucket' } },
                { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
                { kind: 'Field', name: { kind: 'Name', value: 'region' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endpoint' } },
                { kind: 'Field', name: { kind: 'Name', value: 'usePathStyle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'customDomain' } },
                { kind: 'Field', name: { kind: 'Name', value: 'customDomainVerified' } },
                { kind: 'Field', name: { kind: 'Name', value: 'suspended' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isShared' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerAlgorithm' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerTruncate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'imagorCORSOrigins' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canManage' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canDelete' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canLeave' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetSpaceQuery, GetSpaceQueryVariables>
export const CreateSpaceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateSpace' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'SpaceInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createSpace' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'orgId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageMode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bucket' } },
                { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
                { kind: 'Field', name: { kind: 'Name', value: 'region' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endpoint' } },
                { kind: 'Field', name: { kind: 'Name', value: 'usePathStyle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'customDomain' } },
                { kind: 'Field', name: { kind: 'Name', value: 'suspended' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isShared' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerAlgorithm' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerTruncate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'imagorCORSOrigins' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canManage' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canDelete' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canLeave' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateSpaceMutation, CreateSpaceMutationVariables>
export const UpdateSpaceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateSpace' },
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'SpaceInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateSpace' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'orgId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageMode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'storageType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bucket' } },
                { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
                { kind: 'Field', name: { kind: 'Name', value: 'region' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endpoint' } },
                { kind: 'Field', name: { kind: 'Name', value: 'usePathStyle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'customDomain' } },
                { kind: 'Field', name: { kind: 'Name', value: 'suspended' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isShared' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerAlgorithm' } },
                { kind: 'Field', name: { kind: 'Name', value: 'signerTruncate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'imagorCORSOrigins' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canManage' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canDelete' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canLeave' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateSpaceMutation, UpdateSpaceMutationVariables>
export const DeleteSpaceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteSpace' },
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
            name: { kind: 'Name', value: 'deleteSpace' },
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
} as unknown as DocumentNode<DeleteSpaceMutation, DeleteSpaceMutationVariables>
export const GetSpaceRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetSpaceRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
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
            name: { kind: 'Name', value: 'spaceRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetSpaceRegistryQuery, GetSpaceRegistryQueryVariables>
export const SetSpaceRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetSpaceRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
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
            name: { kind: 'Name', value: 'setSpaceRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isEncrypted' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SetSpaceRegistryMutation, SetSpaceRegistryMutationVariables>
export const DeleteSpaceRegistryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteSpaceRegistry' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'keys' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteSpaceRegistry' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'keys' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'keys' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteSpaceRegistryMutation, DeleteSpaceRegistryMutationVariables>
export const SpaceKeyExistsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SpaceKeyExists' },
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
            name: { kind: 'Name', value: 'spaceKeyExists' },
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
} as unknown as DocumentNode<SpaceKeyExistsQuery, SpaceKeyExistsQueryVariables>
export const ListOrgMembersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListOrgMembers' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'orgMembers' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListOrgMembersQuery, ListOrgMembersQueryVariables>
export const ListSpaceMembersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListSpaceMembers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
            name: { kind: 'Name', value: 'spaceMembers' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roleSource' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canChangeRole' } },
                { kind: 'Field', name: { kind: 'Name', value: 'canRemove' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListSpaceMembersQuery, ListSpaceMembersQueryVariables>
export const ListSpaceInvitationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListSpaceInvitations' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
            name: { kind: 'Name', value: 'spaceInvitations' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListSpaceInvitationsQuery, ListSpaceInvitationsQueryVariables>
export const AddOrgMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddOrgMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'username' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'OrgMemberAssignableRole' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addOrgMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'username' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'username' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'role' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AddOrgMemberMutation, AddOrgMemberMutationVariables>
export const AddOrgMemberByEmailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddOrgMemberByEmail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'OrgMemberAssignableRole' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addOrgMemberByEmail' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'role' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AddOrgMemberByEmailMutation, AddOrgMemberByEmailMutationVariables>
export const AddSpaceMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AddSpaceMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'SpaceMemberAssignableRole' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'addSpaceMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'role' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AddSpaceMemberMutation, AddSpaceMemberMutationVariables>
export const InviteSpaceMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'InviteSpaceMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'SpaceMemberAssignableRole' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inviteSpaceMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'role' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'member' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'invitation' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
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
} as unknown as DocumentNode<InviteSpaceMemberMutation, InviteSpaceMemberMutationVariables>
export const RemoveOrgMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveOrgMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
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
            name: { kind: 'Name', value: 'removeOrgMember' },
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
} as unknown as DocumentNode<RemoveOrgMemberMutation, RemoveOrgMemberMutationVariables>
export const LeaveOrganizationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'LeaveOrganization' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'leaveOrganization' } }],
      },
    },
  ],
} as unknown as DocumentNode<LeaveOrganizationMutation, LeaveOrganizationMutationVariables>
export const DeleteOrganizationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteOrganization' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'deleteOrganization' } }],
      },
    },
  ],
} as unknown as DocumentNode<DeleteOrganizationMutation, DeleteOrganizationMutationVariables>
export const RemoveSpaceMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveSpaceMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
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
            name: { kind: 'Name', value: 'removeSpaceMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
} as unknown as DocumentNode<RemoveSpaceMemberMutation, RemoveSpaceMemberMutationVariables>
export const LeaveSpaceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'LeaveSpace' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
            name: { kind: 'Name', value: 'leaveSpace' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LeaveSpaceMutation, LeaveSpaceMutationVariables>
export const UpdateOrgMemberRoleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateOrgMemberRole' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'OrgMemberAssignableRole' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateOrgMemberRole' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'role' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateOrgMemberRoleMutation, UpdateOrgMemberRoleMutationVariables>
export const TransferOrganizationOwnershipDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TransferOrganizationOwnership' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
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
            name: { kind: 'Name', value: 'transferOrganizationOwnership' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ownerUserId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  TransferOrganizationOwnershipMutation,
  TransferOrganizationOwnershipMutationVariables
>
export const UpdateSpaceMemberRoleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateSpaceMemberRole' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'SpaceMemberAssignableRole' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateSpaceMemberRole' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'role' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'role' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'username' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateSpaceMemberRoleMutation, UpdateSpaceMemberRoleMutationVariables>
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
export const LicenseStatusDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'LicenseStatus' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'licenseStatus' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'isLicensed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'licenseType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isOverriddenByConfig' } },
                { kind: 'Field', name: { kind: 'Name', value: 'supportMessage' } },
                { kind: 'Field', name: { kind: 'Name', value: 'maskedLicenseKey' } },
                { kind: 'Field', name: { kind: 'Name', value: 'activatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LicenseStatusQuery, LicenseStatusQueryVariables>
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'path' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'modifiedTime' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
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
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
export const RequestUploadDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RequestUpload' },
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'contentType' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sizeBytes' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'requestUpload' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'contentType' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'contentType' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sizeBytes' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sizeBytes' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'uploadURL' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'requiredHeaders' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
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
} as unknown as DocumentNode<RequestUploadMutation, RequestUploadMutationVariables>
export const CompleteUploadDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CompleteUpload' },
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'completeUpload' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'path' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'path' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CompleteUploadMutation, CompleteUploadMutationVariables>
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
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
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
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateFolderMutation, CreateFolderMutationVariables>
export const CopyFileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CopyFile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sourcePath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'destPath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'copyFile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sourcePath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sourcePath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'destPath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'destPath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CopyFileMutation, CopyFileMutationVariables>
export const MoveFileDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'MoveFile' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sourcePath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'destPath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'moveFile' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sourcePath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sourcePath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'destPath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'destPath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MoveFileMutation, MoveFileMutationVariables>
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
                { kind: 'Field', name: { kind: 'Name', value: 'supportsPresignedUpload' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
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
                { kind: 'Field', name: { kind: 'Name', value: 'code' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TestStorageConfigMutation, TestStorageConfigMutationVariables>
export const BeginStorageUploadProbeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'BeginStorageUploadProbe' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'StorageConfigInput' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'contentType' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sizeBytes' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'beginStorageUploadProbe' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'contentType' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'contentType' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sizeBytes' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sizeBytes' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'probePath' } },
                { kind: 'Field', name: { kind: 'Name', value: 'uploadURL' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  BeginStorageUploadProbeMutation,
  BeginStorageUploadProbeMutationVariables
>
export const CompleteStorageUploadProbeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CompleteStorageUploadProbe' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'StorageConfigInput' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'probePath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'expectedContent' } },
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
            name: { kind: 'Name', value: 'completeStorageUploadProbe' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'probePath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'probePath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'expectedContent' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'expectedContent' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'details' } },
                { kind: 'Field', name: { kind: 'Name', value: 'code' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CompleteStorageUploadProbeMutation,
  CompleteStorageUploadProbeMutationVariables
>
export const SaveTemplateDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SaveTemplate' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'SaveTemplateInput' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'saveTemplate' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'templatePath' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SaveTemplateMutation, SaveTemplateMutationVariables>
export const RegenerateTemplatePreviewDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RegenerateTemplatePreview' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'templatePath' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'regenerateTemplatePreview' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'templatePath' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'templatePath' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'spaceID' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'spaceID' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RegenerateTemplatePreviewMutation,
  RegenerateTemplatePreviewMutationVariables
>
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
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'pendingEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'emailVerified' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hasPassword' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'authProviders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'linkedAt' } },
              ],
            },
          },
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
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'pendingEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'emailVerified' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hasPassword' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'authProviders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'linkedAt' } },
              ],
            },
          },
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
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
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
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'pendingEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'emailVerified' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hasPassword' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'authProviders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'linkedAt' } },
              ],
            },
          },
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
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'pendingEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'emailVerified' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hasPassword' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'authProviders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'linkedAt' } },
              ],
            },
          },
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
export const RequestEmailChangeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RequestEmailChange' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
            name: { kind: 'Name', value: 'requestEmailChange' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'verificationRequired' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RequestEmailChangeMutation, RequestEmailChangeMutationVariables>
export const UnlinkAuthProviderDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UnlinkAuthProvider' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'provider' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
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
            name: { kind: 'Name', value: 'unlinkAuthProvider' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'provider' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'provider' } },
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
} as unknown as DocumentNode<UnlinkAuthProviderMutation, UnlinkAuthProviderMutationVariables>
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
export const ReactivateAccountDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ReactivateAccount' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
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
            name: { kind: 'Name', value: 'reactivateAccount' },
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
} as unknown as DocumentNode<ReactivateAccountMutation, ReactivateAccountMutationVariables>
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
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'pendingEmail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'emailVerified' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hasPassword' } },
          { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'authProviders' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'linkedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateUserMutation, CreateUserMutationVariables>
