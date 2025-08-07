/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'

import * as types from './graphql'

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  '\n  fragment FileInfo on File {\n    name\n    path\n    size\n    isDirectory\n  }\n': typeof types.FileInfoFragmentDoc
  '\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n  }\n': typeof types.FileStatInfoFragmentDoc
  '\n  fragment MetadataInfo on Metadata {\n    key\n    value\n    createdAt\n    updatedAt\n  }\n': typeof types.MetadataInfoFragmentDoc
  '\n  query ListFiles(\n    $path: String!\n    $offset: Int!\n    $limit: Int!\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n': typeof types.ListFilesDocument
  '\n  query StatFile($path: String!) {\n    statFile(path: $path) {\n      ...FileStatInfo\n    }\n  }\n': typeof types.StatFileDocument
  '\n  query ListMetadata($prefix: String) {\n    listMetadata(prefix: $prefix) {\n      ...MetadataInfo\n    }\n  }\n': typeof types.ListMetadataDocument
  '\n  query GetMetadata($key: String!) {\n    getMetadata(key: $key) {\n      ...MetadataInfo\n    }\n  }\n': typeof types.GetMetadataDocument
  '\n  mutation UploadFile($path: String!, $content: Upload!) {\n    uploadFile(path: $path, content: $content)\n  }\n': typeof types.UploadFileDocument
  '\n  mutation DeleteFile($path: String!) {\n    deleteFile(path: $path)\n  }\n': typeof types.DeleteFileDocument
  '\n  mutation CreateFolder($path: String!) {\n    createFolder(path: $path)\n  }\n': typeof types.CreateFolderDocument
  '\n  mutation SetMetadata($key: String!, $value: String!) {\n    setMetadata(key: $key, value: $value) {\n      ...MetadataInfo\n    }\n  }\n': typeof types.SetMetadataDocument
  '\n  mutation DeleteMetadata($key: String!) {\n    deleteMetadata(key: $key)\n  }\n': typeof types.DeleteMetadataDocument
}
const documents: Documents = {
  '\n  fragment FileInfo on File {\n    name\n    path\n    size\n    isDirectory\n  }\n':
    types.FileInfoFragmentDoc,
  '\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n  }\n':
    types.FileStatInfoFragmentDoc,
  '\n  fragment MetadataInfo on Metadata {\n    key\n    value\n    createdAt\n    updatedAt\n  }\n':
    types.MetadataInfoFragmentDoc,
  '\n  query ListFiles(\n    $path: String!\n    $offset: Int!\n    $limit: Int!\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n':
    types.ListFilesDocument,
  '\n  query StatFile($path: String!) {\n    statFile(path: $path) {\n      ...FileStatInfo\n    }\n  }\n':
    types.StatFileDocument,
  '\n  query ListMetadata($prefix: String) {\n    listMetadata(prefix: $prefix) {\n      ...MetadataInfo\n    }\n  }\n':
    types.ListMetadataDocument,
  '\n  query GetMetadata($key: String!) {\n    getMetadata(key: $key) {\n      ...MetadataInfo\n    }\n  }\n':
    types.GetMetadataDocument,
  '\n  mutation UploadFile($path: String!, $content: Upload!) {\n    uploadFile(path: $path, content: $content)\n  }\n':
    types.UploadFileDocument,
  '\n  mutation DeleteFile($path: String!) {\n    deleteFile(path: $path)\n  }\n':
    types.DeleteFileDocument,
  '\n  mutation CreateFolder($path: String!) {\n    createFolder(path: $path)\n  }\n':
    types.CreateFolderDocument,
  '\n  mutation SetMetadata($key: String!, $value: String!) {\n    setMetadata(key: $key, value: $value) {\n      ...MetadataInfo\n    }\n  }\n':
    types.SetMetadataDocument,
  '\n  mutation DeleteMetadata($key: String!) {\n    deleteMetadata(key: $key)\n  }\n':
    types.DeleteMetadataDocument,
}

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment FileInfo on File {\n    name\n    path\n    size\n    isDirectory\n  }\n',
): (typeof documents)['\n  fragment FileInfo on File {\n    name\n    path\n    size\n    isDirectory\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n  }\n',
): (typeof documents)['\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment MetadataInfo on Metadata {\n    key\n    value\n    createdAt\n    updatedAt\n  }\n',
): (typeof documents)['\n  fragment MetadataInfo on Metadata {\n    key\n    value\n    createdAt\n    updatedAt\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListFiles(\n    $path: String!\n    $offset: Int!\n    $limit: Int!\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n',
): (typeof documents)['\n  query ListFiles(\n    $path: String!\n    $offset: Int!\n    $limit: Int!\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query StatFile($path: String!) {\n    statFile(path: $path) {\n      ...FileStatInfo\n    }\n  }\n',
): (typeof documents)['\n  query StatFile($path: String!) {\n    statFile(path: $path) {\n      ...FileStatInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListMetadata($prefix: String) {\n    listMetadata(prefix: $prefix) {\n      ...MetadataInfo\n    }\n  }\n',
): (typeof documents)['\n  query ListMetadata($prefix: String) {\n    listMetadata(prefix: $prefix) {\n      ...MetadataInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetMetadata($key: String!) {\n    getMetadata(key: $key) {\n      ...MetadataInfo\n    }\n  }\n',
): (typeof documents)['\n  query GetMetadata($key: String!) {\n    getMetadata(key: $key) {\n      ...MetadataInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UploadFile($path: String!, $content: Upload!) {\n    uploadFile(path: $path, content: $content)\n  }\n',
): (typeof documents)['\n  mutation UploadFile($path: String!, $content: Upload!) {\n    uploadFile(path: $path, content: $content)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteFile($path: String!) {\n    deleteFile(path: $path)\n  }\n',
): (typeof documents)['\n  mutation DeleteFile($path: String!) {\n    deleteFile(path: $path)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateFolder($path: String!) {\n    createFolder(path: $path)\n  }\n',
): (typeof documents)['\n  mutation CreateFolder($path: String!) {\n    createFolder(path: $path)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation SetMetadata($key: String!, $value: String!) {\n    setMetadata(key: $key, value: $value) {\n      ...MetadataInfo\n    }\n  }\n',
): (typeof documents)['\n  mutation SetMetadata($key: String!, $value: String!) {\n    setMetadata(key: $key, value: $value) {\n      ...MetadataInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteMetadata($key: String!) {\n    deleteMetadata(key: $key)\n  }\n',
): (typeof documents)['\n  mutation DeleteMetadata($key: String!) {\n    deleteMetadata(key: $key)\n  }\n']

export function gql(source: string) {
  return (documents as any)[source] ?? {}
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never
