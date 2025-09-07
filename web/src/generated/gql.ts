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
  '\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n  }\n': typeof types.RegistryInfoFragmentDoc
  '\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n    isOverriddenByConfig\n  }\n': typeof types.SystemRegistryInfoFragmentDoc
  '\n  query ListUserRegistry($prefix: String, $ownerID: String) {\n    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n': typeof types.ListUserRegistryDocument
  '\n  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {\n    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n': typeof types.GetUserRegistryDocument
  '\n  query ListSystemRegistry($prefix: String) {\n    listSystemRegistry(prefix: $prefix) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.ListSystemRegistryDocument
  '\n  query GetSystemRegistry($key: String, $keys: [String!]) {\n    getSystemRegistry(key: $key, keys: $keys) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.GetSystemRegistryDocument
  '\n  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {\n    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n': typeof types.SetUserRegistryDocument
  '\n  mutation DeleteUserRegistry($key: String!, $ownerID: String) {\n    deleteUserRegistry(key: $key, ownerID: $ownerID)\n  }\n': typeof types.DeleteUserRegistryDocument
  '\n  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {\n    setSystemRegistry(entry: $entry, entries: $entries) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.SetSystemRegistryDocument
  '\n  mutation DeleteSystemRegistry($key: String!) {\n    deleteSystemRegistry(key: $key)\n  }\n': typeof types.DeleteSystemRegistryDocument
  '\n  fragment FileInfo on FileItem {\n    name\n    path\n    size\n    isDirectory\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n': typeof types.FileInfoFragmentDoc
  '\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n': typeof types.FileStatInfoFragmentDoc
  '\n  query ListFiles(\n    $path: String!\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n': typeof types.ListFilesDocument
  '\n  query StatFile($path: String!) {\n    statFile(path: $path) {\n      ...FileStatInfo\n    }\n  }\n': typeof types.StatFileDocument
  '\n  mutation UploadFile($path: String!, $content: Upload!) {\n    uploadFile(path: $path, content: $content)\n  }\n': typeof types.UploadFileDocument
  '\n  mutation DeleteFile($path: String!) {\n    deleteFile(path: $path)\n  }\n': typeof types.DeleteFileDocument
  '\n  mutation CreateFolder($path: String!) {\n    createFolder(path: $path)\n  }\n': typeof types.CreateFolderDocument
  '\n  query StorageStatus {\n    storageStatus {\n      configured\n      type\n      restartRequired\n      lastUpdated\n    }\n  }\n': typeof types.StorageStatusDocument
  '\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n': typeof types.ConfigureFileStorageDocument
  '\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n': typeof types.ConfigureS3StorageDocument
  '\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n    }\n  }\n': typeof types.TestStorageConfigDocument
  '\n  fragment UserInfo on User {\n    id\n    displayName\n    email\n    role\n    isActive\n    createdAt\n    updatedAt\n  }\n': typeof types.UserInfoFragmentDoc
  '\n  query Me {\n    me {\n      ...UserInfo\n    }\n  }\n': typeof types.MeDocument
  '\n  query GetUser($id: ID!) {\n    user(id: $id) {\n      ...UserInfo\n    }\n  }\n': typeof types.GetUserDocument
  '\n  query ListUsers($offset: Int = 0, $limit: Int = 20) {\n    users(offset: $offset, limit: $limit) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n': typeof types.ListUsersDocument
  '\n  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {\n    updateProfile(input: $input, userId: $userId) {\n      ...UserInfo\n    }\n  }\n': typeof types.UpdateProfileDocument
  '\n  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {\n    changePassword(input: $input, userId: $userId)\n  }\n': typeof types.ChangePasswordDocument
  '\n  mutation DeactivateAccount($userId: ID) {\n    deactivateAccount(userId: $userId)\n  }\n': typeof types.DeactivateAccountDocument
  '\n  mutation CreateUser($input: CreateUserInput!) {\n    createUser(input: $input) {\n      ...UserInfo\n    }\n  }\n': typeof types.CreateUserDocument
}
const documents: Documents = {
  '\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n  }\n':
    types.RegistryInfoFragmentDoc,
  '\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n    isOverriddenByConfig\n  }\n':
    types.SystemRegistryInfoFragmentDoc,
  '\n  query ListUserRegistry($prefix: String, $ownerID: String) {\n    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n':
    types.ListUserRegistryDocument,
  '\n  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {\n    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n':
    types.GetUserRegistryDocument,
  '\n  query ListSystemRegistry($prefix: String) {\n    listSystemRegistry(prefix: $prefix) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.ListSystemRegistryDocument,
  '\n  query GetSystemRegistry($key: String, $keys: [String!]) {\n    getSystemRegistry(key: $key, keys: $keys) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.GetSystemRegistryDocument,
  '\n  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {\n    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n':
    types.SetUserRegistryDocument,
  '\n  mutation DeleteUserRegistry($key: String!, $ownerID: String) {\n    deleteUserRegistry(key: $key, ownerID: $ownerID)\n  }\n':
    types.DeleteUserRegistryDocument,
  '\n  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {\n    setSystemRegistry(entry: $entry, entries: $entries) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.SetSystemRegistryDocument,
  '\n  mutation DeleteSystemRegistry($key: String!) {\n    deleteSystemRegistry(key: $key)\n  }\n':
    types.DeleteSystemRegistryDocument,
  '\n  fragment FileInfo on FileItem {\n    name\n    path\n    size\n    isDirectory\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n':
    types.FileInfoFragmentDoc,
  '\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n':
    types.FileStatInfoFragmentDoc,
  '\n  query ListFiles(\n    $path: String!\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n':
    types.ListFilesDocument,
  '\n  query StatFile($path: String!) {\n    statFile(path: $path) {\n      ...FileStatInfo\n    }\n  }\n':
    types.StatFileDocument,
  '\n  mutation UploadFile($path: String!, $content: Upload!) {\n    uploadFile(path: $path, content: $content)\n  }\n':
    types.UploadFileDocument,
  '\n  mutation DeleteFile($path: String!) {\n    deleteFile(path: $path)\n  }\n':
    types.DeleteFileDocument,
  '\n  mutation CreateFolder($path: String!) {\n    createFolder(path: $path)\n  }\n':
    types.CreateFolderDocument,
  '\n  query StorageStatus {\n    storageStatus {\n      configured\n      type\n      restartRequired\n      lastUpdated\n    }\n  }\n':
    types.StorageStatusDocument,
  '\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n':
    types.ConfigureFileStorageDocument,
  '\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n':
    types.ConfigureS3StorageDocument,
  '\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n    }\n  }\n':
    types.TestStorageConfigDocument,
  '\n  fragment UserInfo on User {\n    id\n    displayName\n    email\n    role\n    isActive\n    createdAt\n    updatedAt\n  }\n':
    types.UserInfoFragmentDoc,
  '\n  query Me {\n    me {\n      ...UserInfo\n    }\n  }\n': types.MeDocument,
  '\n  query GetUser($id: ID!) {\n    user(id: $id) {\n      ...UserInfo\n    }\n  }\n':
    types.GetUserDocument,
  '\n  query ListUsers($offset: Int = 0, $limit: Int = 20) {\n    users(offset: $offset, limit: $limit) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n':
    types.ListUsersDocument,
  '\n  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {\n    updateProfile(input: $input, userId: $userId) {\n      ...UserInfo\n    }\n  }\n':
    types.UpdateProfileDocument,
  '\n  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {\n    changePassword(input: $input, userId: $userId)\n  }\n':
    types.ChangePasswordDocument,
  '\n  mutation DeactivateAccount($userId: ID) {\n    deactivateAccount(userId: $userId)\n  }\n':
    types.DeactivateAccountDocument,
  '\n  mutation CreateUser($input: CreateUserInput!) {\n    createUser(input: $input) {\n      ...UserInfo\n    }\n  }\n':
    types.CreateUserDocument,
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
  source: '\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n  }\n',
): (typeof documents)['\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n    isOverriddenByConfig\n  }\n',
): (typeof documents)['\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    ownerID\n    isEncrypted\n    isOverriddenByConfig\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListUserRegistry($prefix: String, $ownerID: String) {\n    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  query ListUserRegistry($prefix: String, $ownerID: String) {\n    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {\n    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {\n    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListSystemRegistry($prefix: String) {\n    listSystemRegistry(prefix: $prefix) {\n      ...SystemRegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  query ListSystemRegistry($prefix: String) {\n    listSystemRegistry(prefix: $prefix) {\n      ...SystemRegistryInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetSystemRegistry($key: String, $keys: [String!]) {\n    getSystemRegistry(key: $key, keys: $keys) {\n      ...SystemRegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  query GetSystemRegistry($key: String, $keys: [String!]) {\n    getSystemRegistry(key: $key, keys: $keys) {\n      ...SystemRegistryInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {\n    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {\n    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteUserRegistry($key: String!, $ownerID: String) {\n    deleteUserRegistry(key: $key, ownerID: $ownerID)\n  }\n',
): (typeof documents)['\n  mutation DeleteUserRegistry($key: String!, $ownerID: String) {\n    deleteUserRegistry(key: $key, ownerID: $ownerID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {\n    setSystemRegistry(entry: $entry, entries: $entries) {\n      ...SystemRegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {\n    setSystemRegistry(entry: $entry, entries: $entries) {\n      ...SystemRegistryInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteSystemRegistry($key: String!) {\n    deleteSystemRegistry(key: $key)\n  }\n',
): (typeof documents)['\n  mutation DeleteSystemRegistry($key: String!) {\n    deleteSystemRegistry(key: $key)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment FileInfo on FileItem {\n    name\n    path\n    size\n    isDirectory\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n',
): (typeof documents)['\n  fragment FileInfo on FileItem {\n    name\n    path\n    size\n    isDirectory\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n',
): (typeof documents)['\n  fragment FileStatInfo on FileStat {\n    name\n    path\n    size\n    isDirectory\n    modifiedTime\n    etag\n    thumbnailUrls {\n      grid\n      preview\n      full\n      original\n      meta\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListFiles(\n    $path: String!\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n',
): (typeof documents)['\n  query ListFiles(\n    $path: String!\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        ...FileInfo\n      }\n      totalCount\n    }\n  }\n']
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
  source: '\n  query StorageStatus {\n    storageStatus {\n      configured\n      type\n      restartRequired\n      lastUpdated\n    }\n  }\n',
): (typeof documents)['\n  query StorageStatus {\n    storageStatus {\n      configured\n      type\n      restartRequired\n      lastUpdated\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n',
): (typeof documents)['\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n',
): (typeof documents)['\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      restartRequired\n      timestamp\n      message\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n    }\n  }\n',
): (typeof documents)['\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment UserInfo on User {\n    id\n    displayName\n    email\n    role\n    isActive\n    createdAt\n    updatedAt\n  }\n',
): (typeof documents)['\n  fragment UserInfo on User {\n    id\n    displayName\n    email\n    role\n    isActive\n    createdAt\n    updatedAt\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query Me {\n    me {\n      ...UserInfo\n    }\n  }\n',
): (typeof documents)['\n  query Me {\n    me {\n      ...UserInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetUser($id: ID!) {\n    user(id: $id) {\n      ...UserInfo\n    }\n  }\n',
): (typeof documents)['\n  query GetUser($id: ID!) {\n    user(id: $id) {\n      ...UserInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListUsers($offset: Int = 0, $limit: Int = 20) {\n    users(offset: $offset, limit: $limit) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n',
): (typeof documents)['\n  query ListUsers($offset: Int = 0, $limit: Int = 20) {\n    users(offset: $offset, limit: $limit) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {\n    updateProfile(input: $input, userId: $userId) {\n      ...UserInfo\n    }\n  }\n',
): (typeof documents)['\n  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {\n    updateProfile(input: $input, userId: $userId) {\n      ...UserInfo\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {\n    changePassword(input: $input, userId: $userId)\n  }\n',
): (typeof documents)['\n  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {\n    changePassword(input: $input, userId: $userId)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeactivateAccount($userId: ID) {\n    deactivateAccount(userId: $userId)\n  }\n',
): (typeof documents)['\n  mutation DeactivateAccount($userId: ID) {\n    deactivateAccount(userId: $userId)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateUser($input: CreateUserInput!) {\n    createUser(input: $input) {\n      ...UserInfo\n    }\n  }\n',
): (typeof documents)['\n  mutation CreateUser($input: CreateUserInput!) {\n    createUser(input: $input) {\n      ...UserInfo\n    }\n  }\n']

export function gql(source: string) {
  return (documents as any)[source] ?? {}
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never
