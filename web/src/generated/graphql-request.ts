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
  updatedAt: Scalars['String']['output']
  value: Scalars['String']['output']
}

export type Mutation = {
  __typename?: 'Mutation'
  createFolder: Scalars['Boolean']['output']
  deleteFile: Scalars['Boolean']['output']
  deleteMetadata: Scalars['Boolean']['output']
  setMetadata: Metadata
  uploadFile: Scalars['Boolean']['output']
}

export type MutationCreateFolderArgs = {
  path: Scalars['String']['input']
}

export type MutationDeleteFileArgs = {
  path: Scalars['String']['input']
}

export type MutationDeleteMetadataArgs = {
  key: Scalars['String']['input']
}

export type MutationSetMetadataArgs = {
  key: Scalars['String']['input']
  value: Scalars['String']['input']
}

export type MutationUploadFileArgs = {
  content: Scalars['Upload']['input']
  path: Scalars['String']['input']
}

export type Query = {
  __typename?: 'Query'
  getMetadata: Maybe<Metadata>
  listFiles: FileList
  listMetadata: Array<Metadata>
  statFile: Maybe<FileStat>
}

export type QueryGetMetadataArgs = {
  key: Scalars['String']['input']
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

export type QueryListMetadataArgs = {
  prefix?: InputMaybe<Scalars['String']['input']>
}

export type QueryStatFileArgs = {
  path: Scalars['String']['input']
}

export type SortOption = 'MODIFIED_TIME' | 'NAME' | 'SIZE'

export type SortOrder = 'ASC' | 'DESC'

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

export type MetadataInfoFragment = {
  __typename?: 'Metadata'
  key: string
  value: string
  createdAt: string
  updatedAt: string
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

export type ListMetadataQueryVariables = Exact<{
  prefix?: InputMaybe<Scalars['String']['input']>
}>

export type ListMetadataQuery = {
  __typename?: 'Query'
  listMetadata: Array<{
    __typename?: 'Metadata'
    key: string
    value: string
    createdAt: string
    updatedAt: string
  }>
}

export type GetMetadataQueryVariables = Exact<{
  key: Scalars['String']['input']
}>

export type GetMetadataQuery = {
  __typename?: 'Query'
  getMetadata: {
    __typename?: 'Metadata'
    key: string
    value: string
    createdAt: string
    updatedAt: string
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

export type SetMetadataMutationVariables = Exact<{
  key: Scalars['String']['input']
  value: Scalars['String']['input']
}>

export type SetMetadataMutation = {
  __typename?: 'Mutation'
  setMetadata: {
    __typename?: 'Metadata'
    key: string
    value: string
    createdAt: string
    updatedAt: string
  }
}

export type DeleteMetadataMutationVariables = Exact<{
  key: Scalars['String']['input']
}>

export type DeleteMetadataMutation = { __typename?: 'Mutation'; deleteMetadata: boolean }

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
export const MetadataInfoFragmentDoc = gql`
  fragment MetadataInfo on Metadata {
    key
    value
    createdAt
    updatedAt
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
export const ListMetadataDocument = gql`
  query ListMetadata($prefix: String) {
    listMetadata(prefix: $prefix) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const GetMetadataDocument = gql`
  query GetMetadata($key: String!) {
    getMetadata(key: $key) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
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
export const SetMetadataDocument = gql`
  mutation SetMetadata($key: String!, $value: String!) {
    setMetadata(key: $key, value: $value) {
      ...MetadataInfo
    }
  }
  ${MetadataInfoFragmentDoc}
`
export const DeleteMetadataDocument = gql`
  mutation DeleteMetadata($key: String!) {
    deleteMetadata(key: $key)
  }
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
    ListMetadata(
      variables?: ListMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ListMetadataQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<ListMetadataQuery>({
            document: ListMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'ListMetadata',
        'query',
        variables,
      )
    },
    GetMetadata(
      variables: GetMetadataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetMetadataQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<GetMetadataQuery>({
            document: GetMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'GetMetadata',
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
    SetMetadata(
      variables: SetMetadataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SetMetadataMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<SetMetadataMutation>({
            document: SetMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'SetMetadata',
        'mutation',
        variables,
      )
    },
    DeleteMetadata(
      variables: DeleteMetadataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<DeleteMetadataMutation> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<DeleteMetadataMutation>({
            document: DeleteMetadataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'DeleteMetadata',
        'mutation',
        variables,
      )
    },
  }
}
export type Sdk = ReturnType<typeof getSdk>
