import type { GraphQLClient, RequestOptions } from 'graphql-request'
import gql from 'graphql-tag'

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
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders']
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

export const RegistryInfoFragmentDoc = gql`
  fragment RegistryInfo on UserRegistry {
    key
    value
    isEncrypted
  }
`
export const SystemRegistryInfoFragmentDoc = gql`
  fragment SystemRegistryInfo on SystemRegistry {
    key
    value
    isEncrypted
    isOverriddenByConfig
  }
`
export const UserInfoFragmentDoc = gql`
  fragment UserInfo on User {
    id
    displayName
    username
    role
    isActive
    createdAt
    updatedAt
    email
    pendingEmail
    emailVerified
    hasPassword
    avatarUrl
    authProviders {
      provider
      email
      linkedAt
    }
  }
`
export const ImagorStatusDocument = gql`
  query ImagorStatus {
    imagorStatus {
      configured
      lastUpdated
      isOverriddenByConfig
      config {
        hasSecret
        signerType
        signerTruncate
      }
    }
  }
`
export const ConfigureImagorDocument = gql`
  mutation ConfigureImagor($input: ImagorInput!) {
    configureImagor(input: $input) {
      success
      timestamp
      message
    }
  }
`
export const GenerateImagorUrlDocument = gql`
  mutation GenerateImagorUrl($imagePath: String!, $spaceID: String, $params: ImagorParamsInput!) {
    generateImagorUrl(imagePath: $imagePath, spaceID: $spaceID, params: $params)
  }
`
export const GenerateImagorUrlFromTemplateDocument = gql`
  mutation GenerateImagorUrlFromTemplate(
    $templateJson: String!
    $spaceID: String
    $contextPath: [String!]
    $forPreview: Boolean
    $previewMaxDimensions: DimensionsInput
    $skipLayerId: String
    $appendFilters: [ImagorFilterInput!]
  ) {
    generateImagorUrlFromTemplate(
      templateJson: $templateJson
      spaceID: $spaceID
      contextPath: $contextPath
      forPreview: $forPreview
      previewMaxDimensions: $previewMaxDimensions
      skipLayerId: $skipLayerId
      appendFilters: $appendFilters
    )
  }
`
export const MyOrganizationDocument = gql`
  query MyOrganization {
    myOrganization {
      id
      name
      slug
      ownerUserId
      plan
      planStatus
      createdAt
      updatedAt
    }
  }
`
export const ListSpacesDocument = gql`
  query ListSpaces {
    spaces {
      id
      orgId
      key
      name
      storageUsageBytes
      processingUsageCount
      storageMode
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      customDomainVerified
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
      updatedAt
    }
  }
`
export const GetUsageSummaryDocument = gql`
  query GetUsageSummary {
    usageSummary {
      usedSpaces
      maxSpaces
      usedHostedStorageBytes
      storageLimitGB
      usedTransforms
      transformsLimit
      periodStart
      periodEnd
    }
  }
`
export const CreateCheckoutSessionDocument = gql`
  mutation CreateCheckoutSession($plan: String!, $successURL: String!, $cancelURL: String!) {
    createCheckoutSession(plan: $plan, successURL: $successURL, cancelURL: $cancelURL) {
      url
    }
  }
`
export const CreateBillingPortalSessionDocument = gql`
  mutation CreateBillingPortalSession($returnURL: String!) {
    createBillingPortalSession(returnURL: $returnURL) {
      url
    }
  }
`
export const GetSpaceDocument = gql`
  query GetSpace($key: String!) {
    space(key: $key) {
      id
      orgId
      key
      name
      storageUsageBytes
      storageMode
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      customDomainVerified
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
      updatedAt
    }
  }
`
export const CreateSpaceDocument = gql`
  mutation CreateSpace($input: SpaceInput!) {
    createSpace(input: $input) {
      orgId
      key
      name
      storageMode
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
      updatedAt
    }
  }
`
export const UpdateSpaceDocument = gql`
  mutation UpdateSpace($key: String!, $input: SpaceInput!) {
    updateSpace(key: $key, input: $input) {
      orgId
      key
      name
      storageMode
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
      updatedAt
    }
  }
`
export const DeleteSpaceDocument = gql`
  mutation DeleteSpace($key: String!) {
    deleteSpace(key: $key)
  }
`
export const GetSpaceRegistryDocument = gql`
  query GetSpaceRegistry($spaceID: String!, $keys: [String!]) {
    spaceRegistry(spaceID: $spaceID, keys: $keys) {
      key
      value
      isEncrypted
    }
  }
`
export const SetSpaceRegistryDocument = gql`
  mutation SetSpaceRegistry($spaceID: String!, $entries: [RegistryEntryInput!]) {
    setSpaceRegistry(spaceID: $spaceID, entries: $entries) {
      key
      value
      isEncrypted
    }
  }
`
export const DeleteSpaceRegistryDocument = gql`
  mutation DeleteSpaceRegistry($spaceID: String!, $keys: [String!]!) {
    deleteSpaceRegistry(spaceID: $spaceID, keys: $keys)
  }
`
export const SpaceKeyExistsDocument = gql`
  query SpaceKeyExists($key: String!) {
    spaceKeyExists(key: $key)
  }
`
export const ListOrgMembersDocument = gql`
  query ListOrgMembers {
    orgMembers {
      userId
      username
      displayName
      email
      avatarUrl
      role
      createdAt
    }
  }
`
export const ListSpaceMembersDocument = gql`
  query ListSpaceMembers($spaceID: String!) {
    spaceMembers(spaceID: $spaceID) {
      userId
      username
      displayName
      email
      avatarUrl
      role
      roleSource
      canChangeRole
      canRemove
      createdAt
    }
  }
`
export const ListSpaceInvitationsDocument = gql`
  query ListSpaceInvitations($spaceID: String!) {
    spaceInvitations(spaceID: $spaceID) {
      id
      email
      role
      createdAt
      expiresAt
    }
  }
`
export const AddOrgMemberDocument = gql`
  mutation AddOrgMember($username: String!, $role: OrgMemberAssignableRole!) {
    addOrgMember(username: $username, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`
export const AddOrgMemberByEmailDocument = gql`
  mutation AddOrgMemberByEmail($email: String!, $role: OrgMemberAssignableRole!) {
    addOrgMemberByEmail(email: $email, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`
export const AddSpaceMemberDocument = gql`
  mutation AddSpaceMember($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {
    addSpaceMember(spaceID: $spaceID, userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`
export const InviteSpaceMemberDocument = gql`
  mutation InviteSpaceMember(
    $spaceID: String!
    $email: String!
    $role: SpaceMemberAssignableRole!
  ) {
    inviteSpaceMember(spaceID: $spaceID, email: $email, role: $role) {
      status
      member {
        userId
        username
        displayName
        role
        createdAt
      }
      invitation {
        id
        email
        role
        createdAt
        expiresAt
      }
    }
  }
`
export const RemoveOrgMemberDocument = gql`
  mutation RemoveOrgMember($userId: ID!) {
    removeOrgMember(userId: $userId)
  }
`
export const LeaveOrganizationDocument = gql`
  mutation LeaveOrganization {
    leaveOrganization
  }
`
export const DeleteOrganizationDocument = gql`
  mutation DeleteOrganization {
    deleteOrganization
  }
`
export const RemoveSpaceMemberDocument = gql`
  mutation RemoveSpaceMember($spaceID: String!, $userId: ID!) {
    removeSpaceMember(spaceID: $spaceID, userId: $userId)
  }
`
export const LeaveSpaceDocument = gql`
  mutation LeaveSpace($spaceID: String!) {
    leaveSpace(spaceID: $spaceID)
  }
`
export const UpdateOrgMemberRoleDocument = gql`
  mutation UpdateOrgMemberRole($userId: ID!, $role: OrgMemberAssignableRole!) {
    updateOrgMemberRole(userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`
export const TransferOrganizationOwnershipDocument = gql`
  mutation TransferOrganizationOwnership($userId: ID!) {
    transferOrganizationOwnership(userId: $userId) {
      id
      ownerUserId
      updatedAt
    }
  }
`
export const UpdateSpaceMemberRoleDocument = gql`
  mutation UpdateSpaceMemberRole(
    $spaceID: String!
    $userId: ID!
    $role: SpaceMemberAssignableRole!
  ) {
    updateSpaceMemberRole(spaceID: $spaceID, userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`
export const ListUserRegistryDocument = gql`
  query ListUserRegistry($prefix: String, $ownerID: String) {
    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
  ${RegistryInfoFragmentDoc}
`
export const GetUserRegistryDocument = gql`
  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {
    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
  ${RegistryInfoFragmentDoc}
`
export const ListSystemRegistryDocument = gql`
  query ListSystemRegistry($prefix: String) {
    listSystemRegistry(prefix: $prefix) {
      ...SystemRegistryInfo
    }
  }
  ${SystemRegistryInfoFragmentDoc}
`
export const GetSystemRegistryDocument = gql`
  query GetSystemRegistry($key: String, $keys: [String!]) {
    getSystemRegistry(key: $key, keys: $keys) {
      ...SystemRegistryInfo
    }
  }
  ${SystemRegistryInfoFragmentDoc}
`
export const SetUserRegistryDocument = gql`
  mutation SetUserRegistry(
    $entry: RegistryEntryInput
    $entries: [RegistryEntryInput!]
    $ownerID: String
  ) {
    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
  ${RegistryInfoFragmentDoc}
`
export const DeleteUserRegistryDocument = gql`
  mutation DeleteUserRegistry($key: String!, $ownerID: String) {
    deleteUserRegistry(key: $key, ownerID: $ownerID)
  }
`
export const SetSystemRegistryDocument = gql`
  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {
    setSystemRegistry(entry: $entry, entries: $entries) {
      ...SystemRegistryInfo
    }
  }
  ${SystemRegistryInfoFragmentDoc}
`
export const DeleteSystemRegistryDocument = gql`
  mutation DeleteSystemRegistry($key: String!) {
    deleteSystemRegistry(key: $key)
  }
`
export const LicenseStatusDocument = gql`
  query LicenseStatus {
    licenseStatus {
      isLicensed
      licenseType
      email
      message
      isOverriddenByConfig
      supportMessage
      maskedLicenseKey
      activatedAt
    }
  }
`
export const ListFilesDocument = gql`
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
`
export const StatFileDocument = gql`
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
`
export const UploadFileDocument = gql`
  mutation UploadFile($path: String!, $spaceID: String, $content: Upload!) {
    uploadFile(path: $path, spaceID: $spaceID, content: $content)
  }
`
export const RequestUploadDocument = gql`
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
`
export const CompleteUploadDocument = gql`
  mutation CompleteUpload($path: String!, $spaceID: String) {
    completeUpload(path: $path, spaceID: $spaceID)
  }
`
export const DeleteFileDocument = gql`
  mutation DeleteFile($path: String!, $spaceID: String) {
    deleteFile(path: $path, spaceID: $spaceID)
  }
`
export const CreateFolderDocument = gql`
  mutation CreateFolder($path: String!, $spaceID: String) {
    createFolder(path: $path, spaceID: $spaceID)
  }
`
export const CopyFileDocument = gql`
  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceID: String) {
    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)
  }
`
export const MoveFileDocument = gql`
  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceID: String) {
    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)
  }
`
export const StorageStatusDocument = gql`
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
`
export const ConfigureFileStorageDocument = gql`
  mutation ConfigureFileStorage($input: FileStorageInput!) {
    configureFileStorage(input: $input) {
      success
      timestamp
      message
    }
  }
`
export const ConfigureS3StorageDocument = gql`
  mutation ConfigureS3Storage($input: S3StorageInput!) {
    configureS3Storage(input: $input) {
      success
      timestamp
      message
    }
  }
`
export const TestStorageConfigDocument = gql`
  mutation TestStorageConfig($input: StorageConfigInput!) {
    testStorageConfig(input: $input) {
      success
      message
      details
      code
    }
  }
`
export const BeginStorageUploadProbeDocument = gql`
  mutation BeginStorageUploadProbe(
    $input: StorageConfigInput!
    $contentType: String!
    $sizeBytes: Int!
  ) {
    beginStorageUploadProbe(input: $input, contentType: $contentType, sizeBytes: $sizeBytes) {
      probePath
      uploadURL
      expiresAt
    }
  }
`
export const CompleteStorageUploadProbeDocument = gql`
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
`
export const SaveTemplateDocument = gql`
  mutation SaveTemplate($input: SaveTemplateInput!, $spaceID: String) {
    saveTemplate(input: $input, spaceID: $spaceID) {
      success
      templatePath
      message
    }
  }
`
export const RegenerateTemplatePreviewDocument = gql`
  mutation RegenerateTemplatePreview($templatePath: String!, $spaceID: String) {
    regenerateTemplatePreview(templatePath: $templatePath, spaceID: $spaceID)
  }
`
export const MeDocument = gql`
  query Me {
    me {
      ...UserInfo
    }
  }
  ${UserInfoFragmentDoc}
`
export const GetUserDocument = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserInfo
    }
  }
  ${UserInfoFragmentDoc}
`
export const ListUsersDocument = gql`
  query ListUsers($offset: Int = 0, $limit: Int = 0, $search: String) {
    users(offset: $offset, limit: $limit, search: $search) {
      items {
        ...UserInfo
      }
      totalCount
    }
  }
  ${UserInfoFragmentDoc}
`
export const UpdateProfileDocument = gql`
  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {
    updateProfile(input: $input, userId: $userId) {
      ...UserInfo
    }
  }
  ${UserInfoFragmentDoc}
`
export const ChangePasswordDocument = gql`
  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {
    changePassword(input: $input, userId: $userId)
  }
`
export const RequestEmailChangeDocument = gql`
  mutation RequestEmailChange($email: String!, $userId: ID) {
    requestEmailChange(email: $email, userId: $userId) {
      email
      verificationRequired
    }
  }
`
export const UnlinkAuthProviderDocument = gql`
  mutation UnlinkAuthProvider($provider: String!, $userId: ID) {
    unlinkAuthProvider(provider: $provider, userId: $userId)
  }
`
export const DeactivateAccountDocument = gql`
  mutation DeactivateAccount($userId: ID) {
    deactivateAccount(userId: $userId)
  }
`
export const ReactivateAccountDocument = gql`
  mutation ReactivateAccount($userId: ID!) {
    reactivateAccount(userId: $userId)
  }
`
export const CreateUserDocument = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserInfo
    }
  }
  ${UserInfoFragmentDoc}
`

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) =>
  action()

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    ImagorStatus(
      variables?: ImagorStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ImagorStatusQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ImagorStatusQuery>({
            document: ImagorStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ImagorStatus',
        'query',
        variables,
      )
    },
    ConfigureImagor(
      variables: ConfigureImagorMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ConfigureImagorMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ConfigureImagorMutation>({
            document: ConfigureImagorDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ConfigureImagor',
        'mutation',
        variables,
      )
    },
    GenerateImagorUrl(
      variables: GenerateImagorUrlMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GenerateImagorUrlMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GenerateImagorUrlMutation>({
            document: GenerateImagorUrlDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GenerateImagorUrl',
        'mutation',
        variables,
      )
    },
    GenerateImagorUrlFromTemplate(
      variables: GenerateImagorUrlFromTemplateMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GenerateImagorUrlFromTemplateMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GenerateImagorUrlFromTemplateMutation>({
            document: GenerateImagorUrlFromTemplateDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GenerateImagorUrlFromTemplate',
        'mutation',
        variables,
      )
    },
    MyOrganization(
      variables?: MyOrganizationQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<MyOrganizationQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MyOrganizationQuery>({
            document: MyOrganizationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'MyOrganization',
        'query',
        variables,
      )
    },
    ListSpaces(
      variables?: ListSpacesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListSpacesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListSpacesQuery>({
            document: ListSpacesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListSpaces',
        'query',
        variables,
      )
    },
    GetUsageSummary(
      variables?: GetUsageSummaryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetUsageSummaryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetUsageSummaryQuery>({
            document: GetUsageSummaryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetUsageSummary',
        'query',
        variables,
      )
    },
    CreateCheckoutSession(
      variables: CreateCheckoutSessionMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CreateCheckoutSessionMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateCheckoutSessionMutation>({
            document: CreateCheckoutSessionDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CreateCheckoutSession',
        'mutation',
        variables,
      )
    },
    CreateBillingPortalSession(
      variables: CreateBillingPortalSessionMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CreateBillingPortalSessionMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateBillingPortalSessionMutation>({
            document: CreateBillingPortalSessionDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CreateBillingPortalSession',
        'mutation',
        variables,
      )
    },
    GetSpace(
      variables: GetSpaceQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetSpaceQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetSpaceQuery>({
            document: GetSpaceDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetSpace',
        'query',
        variables,
      )
    },
    CreateSpace(
      variables: CreateSpaceMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CreateSpaceMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateSpaceMutation>({
            document: CreateSpaceDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CreateSpace',
        'mutation',
        variables,
      )
    },
    UpdateSpace(
      variables: UpdateSpaceMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateSpaceMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UpdateSpaceMutation>({
            document: UpdateSpaceDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UpdateSpace',
        'mutation',
        variables,
      )
    },
    DeleteSpace(
      variables: DeleteSpaceMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteSpaceMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteSpaceMutation>({
            document: DeleteSpaceDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteSpace',
        'mutation',
        variables,
      )
    },
    GetSpaceRegistry(
      variables: GetSpaceRegistryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetSpaceRegistryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetSpaceRegistryQuery>({
            document: GetSpaceRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetSpaceRegistry',
        'query',
        variables,
      )
    },
    SetSpaceRegistry(
      variables: SetSpaceRegistryMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetSpaceRegistryMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetSpaceRegistryMutation>({
            document: SetSpaceRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetSpaceRegistry',
        'mutation',
        variables,
      )
    },
    DeleteSpaceRegistry(
      variables: DeleteSpaceRegistryMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteSpaceRegistryMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteSpaceRegistryMutation>({
            document: DeleteSpaceRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteSpaceRegistry',
        'mutation',
        variables,
      )
    },
    SpaceKeyExists(
      variables: SpaceKeyExistsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SpaceKeyExistsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SpaceKeyExistsQuery>({
            document: SpaceKeyExistsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SpaceKeyExists',
        'query',
        variables,
      )
    },
    ListOrgMembers(
      variables?: ListOrgMembersQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListOrgMembersQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListOrgMembersQuery>({
            document: ListOrgMembersDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListOrgMembers',
        'query',
        variables,
      )
    },
    ListSpaceMembers(
      variables: ListSpaceMembersQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListSpaceMembersQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListSpaceMembersQuery>({
            document: ListSpaceMembersDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListSpaceMembers',
        'query',
        variables,
      )
    },
    ListSpaceInvitations(
      variables: ListSpaceInvitationsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListSpaceInvitationsQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListSpaceInvitationsQuery>({
            document: ListSpaceInvitationsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListSpaceInvitations',
        'query',
        variables,
      )
    },
    AddOrgMember(
      variables: AddOrgMemberMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<AddOrgMemberMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddOrgMemberMutation>({
            document: AddOrgMemberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'AddOrgMember',
        'mutation',
        variables,
      )
    },
    AddOrgMemberByEmail(
      variables: AddOrgMemberByEmailMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<AddOrgMemberByEmailMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddOrgMemberByEmailMutation>({
            document: AddOrgMemberByEmailDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'AddOrgMemberByEmail',
        'mutation',
        variables,
      )
    },
    AddSpaceMember(
      variables: AddSpaceMemberMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<AddSpaceMemberMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<AddSpaceMemberMutation>({
            document: AddSpaceMemberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'AddSpaceMember',
        'mutation',
        variables,
      )
    },
    InviteSpaceMember(
      variables: InviteSpaceMemberMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InviteSpaceMemberMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<InviteSpaceMemberMutation>({
            document: InviteSpaceMemberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'InviteSpaceMember',
        'mutation',
        variables,
      )
    },
    RemoveOrgMember(
      variables: RemoveOrgMemberMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RemoveOrgMemberMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RemoveOrgMemberMutation>({
            document: RemoveOrgMemberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'RemoveOrgMember',
        'mutation',
        variables,
      )
    },
    LeaveOrganization(
      variables?: LeaveOrganizationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<LeaveOrganizationMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<LeaveOrganizationMutation>({
            document: LeaveOrganizationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'LeaveOrganization',
        'mutation',
        variables,
      )
    },
    DeleteOrganization(
      variables?: DeleteOrganizationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteOrganizationMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteOrganizationMutation>({
            document: DeleteOrganizationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteOrganization',
        'mutation',
        variables,
      )
    },
    RemoveSpaceMember(
      variables: RemoveSpaceMemberMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RemoveSpaceMemberMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RemoveSpaceMemberMutation>({
            document: RemoveSpaceMemberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'RemoveSpaceMember',
        'mutation',
        variables,
      )
    },
    LeaveSpace(
      variables: LeaveSpaceMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<LeaveSpaceMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<LeaveSpaceMutation>({
            document: LeaveSpaceDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'LeaveSpace',
        'mutation',
        variables,
      )
    },
    UpdateOrgMemberRole(
      variables: UpdateOrgMemberRoleMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateOrgMemberRoleMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UpdateOrgMemberRoleMutation>({
            document: UpdateOrgMemberRoleDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UpdateOrgMemberRole',
        'mutation',
        variables,
      )
    },
    TransferOrganizationOwnership(
      variables: TransferOrganizationOwnershipMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<TransferOrganizationOwnershipMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<TransferOrganizationOwnershipMutation>({
            document: TransferOrganizationOwnershipDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'TransferOrganizationOwnership',
        'mutation',
        variables,
      )
    },
    UpdateSpaceMemberRole(
      variables: UpdateSpaceMemberRoleMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateSpaceMemberRoleMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UpdateSpaceMemberRoleMutation>({
            document: UpdateSpaceMemberRoleDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UpdateSpaceMemberRole',
        'mutation',
        variables,
      )
    },
    ListUserRegistry(
      variables?: ListUserRegistryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListUserRegistryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListUserRegistryQuery>({
            document: ListUserRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListUserRegistry',
        'query',
        variables,
      )
    },
    GetUserRegistry(
      variables?: GetUserRegistryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetUserRegistryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetUserRegistryQuery>({
            document: GetUserRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetUserRegistry',
        'query',
        variables,
      )
    },
    ListSystemRegistry(
      variables?: ListSystemRegistryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListSystemRegistryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListSystemRegistryQuery>({
            document: ListSystemRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListSystemRegistry',
        'query',
        variables,
      )
    },
    GetSystemRegistry(
      variables?: GetSystemRegistryQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetSystemRegistryQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetSystemRegistryQuery>({
            document: GetSystemRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetSystemRegistry',
        'query',
        variables,
      )
    },
    SetUserRegistry(
      variables?: SetUserRegistryMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetUserRegistryMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetUserRegistryMutation>({
            document: SetUserRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetUserRegistry',
        'mutation',
        variables,
      )
    },
    DeleteUserRegistry(
      variables: DeleteUserRegistryMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteUserRegistryMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteUserRegistryMutation>({
            document: DeleteUserRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteUserRegistry',
        'mutation',
        variables,
      )
    },
    SetSystemRegistry(
      variables?: SetSystemRegistryMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetSystemRegistryMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetSystemRegistryMutation>({
            document: SetSystemRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetSystemRegistry',
        'mutation',
        variables,
      )
    },
    DeleteSystemRegistry(
      variables: DeleteSystemRegistryMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteSystemRegistryMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteSystemRegistryMutation>({
            document: DeleteSystemRegistryDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteSystemRegistry',
        'mutation',
        variables,
      )
    },
    LicenseStatus(
      variables?: LicenseStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<LicenseStatusQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<LicenseStatusQuery>({
            document: LicenseStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'LicenseStatus',
        'query',
        variables,
      )
    },
    ListFiles(
      variables: ListFilesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListFilesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListFilesQuery>({
            document: ListFilesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListFiles',
        'query',
        variables,
      )
    },
    StatFile(
      variables: StatFileQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StatFileQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<StatFileQuery>({
            document: StatFileDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'StatFile',
        'query',
        variables,
      )
    },
    UploadFile(
      variables: UploadFileMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UploadFileMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UploadFileMutation>({
            document: UploadFileDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UploadFile',
        'mutation',
        variables,
      )
    },
    RequestUpload(
      variables: RequestUploadMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RequestUploadMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RequestUploadMutation>({
            document: RequestUploadDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'RequestUpload',
        'mutation',
        variables,
      )
    },
    CompleteUpload(
      variables: CompleteUploadMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CompleteUploadMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CompleteUploadMutation>({
            document: CompleteUploadDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CompleteUpload',
        'mutation',
        variables,
      )
    },
    DeleteFile(
      variables: DeleteFileMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteFileMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteFileMutation>({
            document: DeleteFileDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteFile',
        'mutation',
        variables,
      )
    },
    CreateFolder(
      variables: CreateFolderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CreateFolderMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateFolderMutation>({
            document: CreateFolderDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CreateFolder',
        'mutation',
        variables,
      )
    },
    CopyFile(
      variables: CopyFileMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CopyFileMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CopyFileMutation>({
            document: CopyFileDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CopyFile',
        'mutation',
        variables,
      )
    },
    MoveFile(
      variables: MoveFileMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<MoveFileMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MoveFileMutation>({
            document: MoveFileDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'MoveFile',
        'mutation',
        variables,
      )
    },
    StorageStatus(
      variables?: StorageStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StorageStatusQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<StorageStatusQuery>({
            document: StorageStatusDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'StorageStatus',
        'query',
        variables,
      )
    },
    ConfigureFileStorage(
      variables: ConfigureFileStorageMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ConfigureFileStorageMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ConfigureFileStorageMutation>({
            document: ConfigureFileStorageDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ConfigureFileStorage',
        'mutation',
        variables,
      )
    },
    ConfigureS3Storage(
      variables: ConfigureS3StorageMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ConfigureS3StorageMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ConfigureS3StorageMutation>({
            document: ConfigureS3StorageDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ConfigureS3Storage',
        'mutation',
        variables,
      )
    },
    TestStorageConfig(
      variables: TestStorageConfigMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<TestStorageConfigMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<TestStorageConfigMutation>({
            document: TestStorageConfigDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'TestStorageConfig',
        'mutation',
        variables,
      )
    },
    BeginStorageUploadProbe(
      variables: BeginStorageUploadProbeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<BeginStorageUploadProbeMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<BeginStorageUploadProbeMutation>({
            document: BeginStorageUploadProbeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'BeginStorageUploadProbe',
        'mutation',
        variables,
      )
    },
    CompleteStorageUploadProbe(
      variables: CompleteStorageUploadProbeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CompleteStorageUploadProbeMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CompleteStorageUploadProbeMutation>({
            document: CompleteStorageUploadProbeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CompleteStorageUploadProbe',
        'mutation',
        variables,
      )
    },
    SaveTemplate(
      variables: SaveTemplateMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SaveTemplateMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SaveTemplateMutation>({
            document: SaveTemplateDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SaveTemplate',
        'mutation',
        variables,
      )
    },
    RegenerateTemplatePreview(
      variables: RegenerateTemplatePreviewMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RegenerateTemplatePreviewMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RegenerateTemplatePreviewMutation>({
            document: RegenerateTemplatePreviewDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'RegenerateTemplatePreview',
        'mutation',
        variables,
      )
    },
    Me(
      variables?: MeQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<MeQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<MeQuery>({
            document: MeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'Me',
        'query',
        variables,
      )
    },
    GetUser(
      variables: GetUserQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetUserQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetUserQuery>({
            document: GetUserDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetUser',
        'query',
        variables,
      )
    },
    ListUsers(
      variables?: ListUsersQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListUsersQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListUsersQuery>({
            document: ListUsersDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListUsers',
        'query',
        variables,
      )
    },
    UpdateProfile(
      variables: UpdateProfileMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateProfileMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UpdateProfileMutation>({
            document: UpdateProfileDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UpdateProfile',
        'mutation',
        variables,
      )
    },
    ChangePassword(
      variables: ChangePasswordMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ChangePasswordMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ChangePasswordMutation>({
            document: ChangePasswordDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ChangePassword',
        'mutation',
        variables,
      )
    },
    RequestEmailChange(
      variables: RequestEmailChangeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RequestEmailChangeMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<RequestEmailChangeMutation>({
            document: RequestEmailChangeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'RequestEmailChange',
        'mutation',
        variables,
      )
    },
    UnlinkAuthProvider(
      variables: UnlinkAuthProviderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UnlinkAuthProviderMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<UnlinkAuthProviderMutation>({
            document: UnlinkAuthProviderDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'UnlinkAuthProvider',
        'mutation',
        variables,
      )
    },
    DeactivateAccount(
      variables?: DeactivateAccountMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeactivateAccountMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeactivateAccountMutation>({
            document: DeactivateAccountDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeactivateAccount',
        'mutation',
        variables,
      )
    },
    ReactivateAccount(
      variables: ReactivateAccountMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ReactivateAccountMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ReactivateAccountMutation>({
            document: ReactivateAccountDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ReactivateAccount',
        'mutation',
        variables,
      )
    },
    CreateUser(
      variables: CreateUserMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CreateUserMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<CreateUserMutation>({
            document: CreateUserDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'CreateUser',
        'mutation',
        variables,
      )
    },
  }
}
export type Sdk = ReturnType<typeof getSdk>
