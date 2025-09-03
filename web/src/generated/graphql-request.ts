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
  JSON: { input: Record<string, any>; output: Record<string, any> }
  Upload: { input: File; output: File }
}

export type ChangePasswordInput = {
  currentPassword: InputMaybe<Scalars['String']['input']>
  newPassword: Scalars['String']['input']
}

export type CreateUserInput = {
  displayName: Scalars['String']['input']
  email: Scalars['String']['input']
  password: Scalars['String']['input']
  role: Scalars['String']['input']
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
}

export type Mutation = {
  __typename?: 'Mutation'
  changePassword: Scalars['Boolean']['output']
  createFolder: Scalars['Boolean']['output']
  createUser: User
  deactivateAccount: Scalars['Boolean']['output']
  deleteFile: Scalars['Boolean']['output']
  deleteSystemRegistry: Scalars['Boolean']['output']
  deleteUserRegistry: Scalars['Boolean']['output']
  setSystemRegistry: Array<SystemRegistry>
  setUserRegistry: Array<UserRegistry>
  updateProfile: User
  uploadFile: Scalars['Boolean']['output']
}

export type MutationChangePasswordArgs = {
  input: ChangePasswordInput
  userId?: InputMaybe<Scalars['ID']['input']>
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
  key: Scalars['String']['input']
}

export type MutationDeleteUserRegistryArgs = {
  key: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
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
  listFiles: FileList
  listSystemRegistry: Array<SystemRegistry>
  listUserRegistry: Array<UserRegistry>
  me: Maybe<User>
  statFile: Maybe<FileStat>
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
  limit: Scalars['Int']['input']
  offset: Scalars['Int']['input']
  onlyFiles?: InputMaybe<Scalars['Boolean']['input']>
  onlyFolders?: InputMaybe<Scalars['Boolean']['input']>
  path: Scalars['String']['input']
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

export type SortOption = 'MODIFIED_TIME' | 'NAME' | 'SIZE'

export type SortOrder = 'ASC' | 'DESC'

export type SystemRegistry = {
  __typename?: 'SystemRegistry'
  isEncrypted: Scalars['Boolean']['output']
  isOverriddenByConfig: Scalars['Boolean']['output']
  key: Scalars['String']['output']
  ownerID: Scalars['String']['output']
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
  email: InputMaybe<Scalars['String']['input']>
}

export type User = {
  __typename?: 'User'
  createdAt: Scalars['String']['output']
  displayName: Scalars['String']['output']
  email: Scalars['String']['output']
  id: Scalars['ID']['output']
  isActive: Scalars['Boolean']['output']
  role: Scalars['String']['output']
  updatedAt: Scalars['String']['output']
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
  ownerID: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type RegistryInfoFragment = {
  __typename?: 'UserRegistry'
  key: string
  value: string
  ownerID: string
  isEncrypted: boolean
}

export type SystemRegistryInfoFragment = {
  __typename?: 'SystemRegistry'
  key: string
  value: string
  ownerID: string
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
    ownerID: string
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
    ownerID: string
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
    ownerID: string
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
    ownerID: string
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
    ownerID: string
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
    ownerID: string
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
}

export type ListFilesQueryVariables = Exact<{
  path: Scalars['String']['input']
  offset: Scalars['Int']['input']
  limit: Scalars['Int']['input']
  onlyFiles?: InputMaybe<Scalars['Boolean']['input']>
  onlyFolders?: InputMaybe<Scalars['Boolean']['input']>
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

export type UserInfoFragment = {
  __typename?: 'User'
  id: string
  displayName: string
  email: string
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
    email: string
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
    email: string
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
      email: string
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
    email: string
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
    email: string
    role: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

export const RegistryInfoFragmentDoc = gql`
  fragment RegistryInfo on UserRegistry {
    key
    value
    ownerID
    isEncrypted
  }
`
export const SystemRegistryInfoFragmentDoc = gql`
  fragment SystemRegistryInfo on SystemRegistry {
    key
    value
    ownerID
    isEncrypted
    isOverriddenByConfig
  }
`
export const FileInfoFragmentDoc = gql`
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
`
export const FileStatInfoFragmentDoc = gql`
  fragment FileStatInfo on FileStat {
    name
    path
    size
    isDirectory
    modifiedTime
    etag
  }
`
export const UserInfoFragmentDoc = gql`
  fragment UserInfo on User {
    id
    displayName
    email
    role
    isActive
    createdAt
    updatedAt
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
export const ListFilesDocument = gql`
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
  ${FileInfoFragmentDoc}
`
export const StatFileDocument = gql`
  query StatFile($path: String!) {
    statFile(path: $path) {
      ...FileStatInfo
    }
  }
  ${FileStatInfoFragmentDoc}
`
export const UploadFileDocument = gql`
  mutation UploadFile($path: String!, $content: Upload!) {
    uploadFile(path: $path, content: $content)
  }
`
export const DeleteFileDocument = gql`
  mutation DeleteFile($path: String!) {
    deleteFile(path: $path)
  }
`
export const CreateFolderDocument = gql`
  mutation CreateFolder($path: String!) {
    createFolder(path: $path)
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
  query ListUsers($offset: Int = 0, $limit: Int = 20) {
    users(offset: $offset, limit: $limit) {
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
export const DeactivateAccountDocument = gql`
  mutation DeactivateAccount($userId: ID) {
    deactivateAccount(userId: $userId)
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
