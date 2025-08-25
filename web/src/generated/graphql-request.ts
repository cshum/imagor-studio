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

export type Metadata = {
  __typename?: 'Metadata'
  createdAt: Scalars['String']['output']
  key: Scalars['String']['output']
  ownerID: Scalars['String']['output']
  updatedAt: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type Mutation = {
  __typename?: 'Mutation'
  changePassword: Scalars['Boolean']['output']
  createFolder: Scalars['Boolean']['output']
  createUser: User
  deactivateAccount: Scalars['Boolean']['output']
  deleteFile: Scalars['Boolean']['output']
  deleteSystemMetadata: Scalars['Boolean']['output']
  deleteUserMetadata: Scalars['Boolean']['output']
  setSystemMetadata: Metadata
  setUserMetadata: Metadata
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

export type MutationDeleteSystemMetadataArgs = {
  key: Scalars['String']['input']
}

export type MutationDeleteUserMetadataArgs = {
  key: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
}

export type MutationSetSystemMetadataArgs = {
  key: Scalars['String']['input']
  value: Scalars['String']['input']
}

export type MutationSetUserMetadataArgs = {
  key: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
  value: Scalars['String']['input']
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
  getSystemMetadata: Maybe<Metadata>
  getUserMetadata: Maybe<Metadata>
  listFiles: FileList
  listSystemMetadata: Array<Metadata>
  listUserMetadata: Array<Metadata>
  me: Maybe<User>
  statFile: Maybe<FileStat>
  user: Maybe<User>
  users: UserList
}

export type QueryGetSystemMetadataArgs = {
  key: Scalars['String']['input']
}

export type QueryGetUserMetadataArgs = {
  key: Scalars['String']['input']
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

export type QueryListSystemMetadataArgs = {
  prefix?: InputMaybe<Scalars['String']['input']>
}

export type QueryListUserMetadataArgs = {
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

export type SortOption = 'MODIFIED_TIME' | 'NAME' | 'SIZE'

export type SortOrder = 'ASC' | 'DESC'

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

export type MetadataInfoFragment = {
  __typename?: 'Metadata'
  key: string
  value: string
  ownerID: string
  createdAt: string
  updatedAt: string
}

export type ListUserMetadataQueryVariables = Exact<{
  prefix?: InputMaybe<Scalars['String']['input']>
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type ListUserMetadataQuery = {
  __typename?: 'Query'
  listUserMetadata: Array<{
    __typename?: 'Metadata'
    key: string
    value: string
    ownerID: string
    createdAt: string
    updatedAt: string
  }>
}

export type GetUserMetadataQueryVariables = Exact<{
  key: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type GetUserMetadataQuery = {
  __typename?: 'Query'
  getUserMetadata: {
    __typename?: 'Metadata'
    key: string
    value: string
    ownerID: string
    createdAt: string
    updatedAt: string
  } | null
}

export type ListSystemMetadataQueryVariables = Exact<{
  prefix?: InputMaybe<Scalars['String']['input']>
}>

export type ListSystemMetadataQuery = {
  __typename?: 'Query'
  listSystemMetadata: Array<{
    __typename?: 'Metadata'
    key: string
    value: string
    ownerID: string
    createdAt: string
    updatedAt: string
  }>
}

export type GetSystemMetadataQueryVariables = Exact<{
  key: Scalars['String']['input']
}>

export type GetSystemMetadataQuery = {
  __typename?: 'Query'
  getSystemMetadata: {
    __typename?: 'Metadata'
    key: string
    value: string
    ownerID: string
    createdAt: string
    updatedAt: string
  } | null
}

export type SetUserMetadataMutationVariables = Exact<{
  key: Scalars['String']['input']
  value: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type SetUserMetadataMutation = {
  __typename?: 'Mutation'
  setUserMetadata: {
    __typename?: 'Metadata'
    key: string
    value: string
    ownerID: string
    createdAt: string
    updatedAt: string
  }
}

export type DeleteUserMetadataMutationVariables = Exact<{
  key: Scalars['String']['input']
  ownerID?: InputMaybe<Scalars['String']['input']>
}>

export type DeleteUserMetadataMutation = { __typename?: 'Mutation'; deleteUserMetadata: boolean }

export type SetSystemMetadataMutationVariables = Exact<{
  key: Scalars['String']['input']
  value: Scalars['String']['input']
}>

export type SetSystemMetadataMutation = {
  __typename?: 'Mutation'
  setSystemMetadata: {
    __typename?: 'Metadata'
    key: string
    value: string
    ownerID: string
    createdAt: string
    updatedAt: string
  }
}

export type DeleteSystemMetadataMutationVariables = Exact<{
  key: Scalars['String']['input']
}>

export type DeleteSystemMetadataMutation = {
  __typename?: 'Mutation'
  deleteSystemMetadata: boolean
}

export type FileInfoFragment = {
  __typename?: 'FileItem'
  name: string
  path: string
  size: number
  isDirectory: boolean
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

export const MetadataInfoFragmentDoc = gql`
  fragment MetadataInfo on Metadata {
    key
    value
    ownerID
    createdAt
    updatedAt
  }
`
export const FileInfoFragmentDoc = gql`
  fragment FileInfo on FileItem {
    name
    path
    size
    isDirectory
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
export const ListUserMetadataDocument = gql`
  query ListUserMetadata($prefix: String, $ownerID: String) {
    listUserMetadata(prefix: $prefix, ownerID: $ownerID) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const GetUserMetadataDocument = gql`
  query GetUserMetadata($key: String!, $ownerID: String) {
    getUserMetadata(key: $key, ownerID: $ownerID) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const ListSystemMetadataDocument = gql`
  query ListSystemMetadata($prefix: String) {
    listSystemMetadata(prefix: $prefix) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const GetSystemMetadataDocument = gql`
  query GetSystemMetadata($key: String!) {
    getSystemMetadata(key: $key) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const SetUserMetadataDocument = gql`
  mutation SetUserMetadata($key: String!, $value: String!, $ownerID: String) {
    setUserMetadata(key: $key, value: $value, ownerID: $ownerID) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const DeleteUserMetadataDocument = gql`
  mutation DeleteUserMetadata($key: String!, $ownerID: String) {
    deleteUserMetadata(key: $key, ownerID: $ownerID)
  }
`
export const SetSystemMetadataDocument = gql`
  mutation SetSystemMetadata($key: String!, $value: String!) {
    setSystemMetadata(key: $key, value: $value) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const DeleteSystemMetadataDocument = gql`
  mutation DeleteSystemMetadata($key: String!) {
    deleteSystemMetadata(key: $key)
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
    ListUserMetadata(
      variables?: ListUserMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListUserMetadataQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListUserMetadataQuery>({
            document: ListUserMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListUserMetadata',
        'query',
        variables,
      )
    },
    GetUserMetadata(
      variables: GetUserMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetUserMetadataQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetUserMetadataQuery>({
            document: GetUserMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetUserMetadata',
        'query',
        variables,
      )
    },
    ListSystemMetadata(
      variables?: ListSystemMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListSystemMetadataQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListSystemMetadataQuery>({
            document: ListSystemMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListSystemMetadata',
        'query',
        variables,
      )
    },
    GetSystemMetadata(
      variables: GetSystemMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetSystemMetadataQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetSystemMetadataQuery>({
            document: GetSystemMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetSystemMetadata',
        'query',
        variables,
      )
    },
    SetUserMetadata(
      variables: SetUserMetadataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetUserMetadataMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetUserMetadataMutation>({
            document: SetUserMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetUserMetadata',
        'mutation',
        variables,
      )
    },
    DeleteUserMetadata(
      variables: DeleteUserMetadataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteUserMetadataMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteUserMetadataMutation>({
            document: DeleteUserMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteUserMetadata',
        'mutation',
        variables,
      )
    },
    SetSystemMetadata(
      variables: SetSystemMetadataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetSystemMetadataMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetSystemMetadataMutation>({
            document: SetSystemMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetSystemMetadata',
        'mutation',
        variables,
      )
    },
    DeleteSystemMetadata(
      variables: DeleteSystemMetadataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteSystemMetadataMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteSystemMetadataMutation>({
            document: DeleteSystemMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteSystemMetadata',
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
