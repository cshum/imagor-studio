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
  JSON: { input: Record<string, any>; output: Record<string, any> }
  Upload: { input: File; output: File }
}

export type File = {
  __typename?: 'File'
  isDirectory: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  path: Scalars['String']['output']
  size: Scalars['Int']['output']
}

export type FileList = {
  __typename?: 'FileList'
  items: Array<File>
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
  __typename?: 'File'
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
      __typename?: 'File'
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

export const FileInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'FileInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'File' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'size' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
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
        ],
      },
    },
  ],
} as unknown as DocumentNode<FileStatInfoFragment, unknown>
export const MetadataInfoFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'MetadataInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Metadata' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MetadataInfoFragment, unknown>
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
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
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
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'File' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'path' } },
          { kind: 'Field', name: { kind: 'Name', value: 'size' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isDirectory' } },
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
        ],
      },
    },
  ],
} as unknown as DocumentNode<StatFileQuery, StatFileQueryVariables>
export const ListMetadataDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ListMetadata' },
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
            name: { kind: 'Name', value: 'listMetadata' },
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
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'MetadataInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'MetadataInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Metadata' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ListMetadataQuery, ListMetadataQueryVariables>
export const GetMetadataDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetMetadata' },
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
            name: { kind: 'Name', value: 'getMetadata' },
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
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'MetadataInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'MetadataInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Metadata' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetMetadataQuery, GetMetadataQueryVariables>
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
export const SetMetadataDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetMetadata' },
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
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'value' } },
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
            name: { kind: 'Name', value: 'setMetadata' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'key' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'value' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'value' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'MetadataInfo' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'MetadataInfo' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Metadata' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'value' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SetMetadataMutation, SetMetadataMutationVariables>
export const DeleteMetadataDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteMetadata' },
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
            name: { kind: 'Name', value: 'deleteMetadata' },
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
} as unknown as DocumentNode<DeleteMetadataMutation, DeleteMetadataMutationVariables>
