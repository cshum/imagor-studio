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
  '\n  query ImagorStatus {\n    imagorStatus {\n      configured\n      lastUpdated\n      isOverriddenByConfig\n      config {\n        hasSecret\n        signerType\n        signerTruncate\n      }\n    }\n  }\n': typeof types.ImagorStatusDocument
  '\n  mutation ConfigureImagor($input: ImagorInput!) {\n    configureImagor(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n': typeof types.ConfigureImagorDocument
  '\n  mutation GenerateImagorUrl(\n    $imagePath: String!\n    $spaceID: String\n    $params: ImagorParamsInput!\n  ) {\n    generateImagorUrl(\n      imagePath: $imagePath\n      spaceID: $spaceID\n      params: $params\n    )\n  }\n': typeof types.GenerateImagorUrlDocument
  '\n  mutation GenerateImagorUrlFromTemplate(\n    $templateJson: String!\n    $spaceID: String\n    $contextPath: [String!]\n    $forPreview: Boolean\n    $previewMaxDimensions: DimensionsInput\n    $skipLayerId: String\n    $appendFilters: [ImagorFilterInput!]\n  ) {\n    generateImagorUrlFromTemplate(\n      templateJson: $templateJson\n      spaceID: $spaceID\n      contextPath: $contextPath\n      forPreview: $forPreview\n      previewMaxDimensions: $previewMaxDimensions\n      skipLayerId: $skipLayerId\n      appendFilters: $appendFilters\n    )\n  }\n': typeof types.GenerateImagorUrlFromTemplateDocument
  '\n  query MyOrganization {\n    myOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n': typeof types.MyOrganizationDocument
  '\n  query ListSpaces {\n    spaces {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      processingUsageCount\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n': typeof types.ListSpacesDocument
  '\n  query GetUsageSummary {\n    usageSummary {\n      usedSpaces\n      maxSpaces\n      usedHostedStorageBytes\n      storageLimitGB\n      usedTransforms\n      transformsLimit\n      periodStart\n      periodEnd\n    }\n  }\n': typeof types.GetUsageSummaryDocument
  '\n  mutation CreateCheckoutSession($plan: String!, $successURL: String!, $cancelURL: String!) {\n    createCheckoutSession(plan: $plan, successURL: $successURL, cancelURL: $cancelURL) {\n      url\n    }\n  }\n': typeof types.CreateCheckoutSessionDocument
  '\n  mutation CreateBillingPortalSession($returnURL: String!) {\n    createBillingPortalSession(returnURL: $returnURL) {\n      url\n    }\n  }\n': typeof types.CreateBillingPortalSessionDocument
  '\n  query GetSpace($key: String!) {\n    space(key: $key) {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n': typeof types.GetSpaceDocument
  '\n  mutation CreateSpace($input: SpaceInput!) {\n    createSpace(input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n': typeof types.CreateSpaceDocument
  '\n  mutation UpdateSpace($key: String!, $input: SpaceInput!) {\n    updateSpace(key: $key, input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n': typeof types.UpdateSpaceDocument
  '\n  mutation DeleteSpace($key: String!) {\n    deleteSpace(key: $key)\n  }\n': typeof types.DeleteSpaceDocument
  '\n  query GetSpaceRegistry($spaceID: String!, $keys: [String!]) {\n    spaceRegistry(spaceID: $spaceID, keys: $keys) {\n      key\n      value\n      isEncrypted\n    }\n  }\n': typeof types.GetSpaceRegistryDocument
  '\n  mutation SetSpaceRegistry($spaceID: String!, $entries: [RegistryEntryInput!]) {\n    setSpaceRegistry(spaceID: $spaceID, entries: $entries) {\n      key\n      value\n      isEncrypted\n    }\n  }\n': typeof types.SetSpaceRegistryDocument
  '\n  mutation DeleteSpaceRegistry($spaceID: String!, $keys: [String!]!) {\n    deleteSpaceRegistry(spaceID: $spaceID, keys: $keys)\n  }\n': typeof types.DeleteSpaceRegistryDocument
  '\n  query SpaceKeyExists($key: String!) {\n    spaceKeyExists(key: $key)\n  }\n': typeof types.SpaceKeyExistsDocument
  '\n  query ListOrgMembers {\n    orgMembers {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      createdAt\n    }\n  }\n': typeof types.ListOrgMembersDocument
  '\n  query ListOrgInvitations {\n    orgInvitations {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n': typeof types.ListOrgInvitationsDocument
  '\n  query ListSpaceMembers($spaceID: String!) {\n    spaceMembers(spaceID: $spaceID) {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      roleSource\n      canChangeRole\n      canRemove\n      createdAt\n    }\n  }\n': typeof types.ListSpaceMembersDocument
  '\n  query ListSpaceInvitations($spaceID: String!) {\n    spaceInvitations(spaceID: $spaceID) {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n': typeof types.ListSpaceInvitationsDocument
  '\n  mutation AddOrgMember($username: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMember(username: $username, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n': typeof types.AddOrgMemberDocument
  '\n  mutation AddOrgMemberByEmail($email: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMemberByEmail(email: $email, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n': typeof types.AddOrgMemberByEmailDocument
  '\n  mutation InviteOrgMember($email: String!, $role: OrgMemberAssignableRole!) {\n    inviteOrgMember(email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n': typeof types.InviteOrgMemberDocument
  '\n  mutation CancelOrgInvitation($invitationId: ID!) {\n    cancelOrgInvitation(invitationId: $invitationId)\n  }\n': typeof types.CancelOrgInvitationDocument
  '\n  mutation AddSpaceMember($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    addSpaceMember(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n': typeof types.AddSpaceMemberDocument
  '\n  mutation InviteSpaceMember($spaceID: String!, $email: String!, $role: SpaceMemberAssignableRole!) {\n    inviteSpaceMember(spaceID: $spaceID, email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n': typeof types.InviteSpaceMemberDocument
  '\n  mutation RemoveOrgMember($userId: ID!) {\n    removeOrgMember(userId: $userId)\n  }\n': typeof types.RemoveOrgMemberDocument
  '\n  mutation LeaveOrganization {\n    leaveOrganization\n  }\n': typeof types.LeaveOrganizationDocument
  '\n  mutation DeleteOrganization {\n    deleteOrganization\n  }\n': typeof types.DeleteOrganizationDocument
  '\n  mutation CreateOrganization {\n    createOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n': typeof types.CreateOrganizationDocument
  '\n  mutation RemoveSpaceMember($spaceID: String!, $userId: ID!) {\n    removeSpaceMember(spaceID: $spaceID, userId: $userId)\n  }\n': typeof types.RemoveSpaceMemberDocument
  '\n  mutation LeaveSpace($spaceID: String!) {\n    leaveSpace(spaceID: $spaceID)\n  }\n': typeof types.LeaveSpaceDocument
  '\n  mutation UpdateOrgMemberRole($userId: ID!, $role: OrgMemberAssignableRole!) {\n    updateOrgMemberRole(userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n': typeof types.UpdateOrgMemberRoleDocument
  '\n  mutation TransferOrganizationOwnership($userId: ID!) {\n    transferOrganizationOwnership(userId: $userId) {\n      id\n      ownerUserId\n      updatedAt\n    }\n  }\n': typeof types.TransferOrganizationOwnershipDocument
  '\n  mutation UpdateSpaceMemberRole($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    updateSpaceMemberRole(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n': typeof types.UpdateSpaceMemberRoleDocument
  '\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    isEncrypted\n  }\n': typeof types.RegistryInfoFragmentDoc
  '\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    isEncrypted\n    isOverriddenByConfig\n  }\n': typeof types.SystemRegistryInfoFragmentDoc
  '\n  query ListUserRegistry($prefix: String, $ownerID: String) {\n    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n': typeof types.ListUserRegistryDocument
  '\n  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {\n    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n': typeof types.GetUserRegistryDocument
  '\n  query ListSystemRegistry($prefix: String) {\n    listSystemRegistry(prefix: $prefix) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.ListSystemRegistryDocument
  '\n  query GetSystemRegistry($key: String, $keys: [String!]) {\n    getSystemRegistry(key: $key, keys: $keys) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.GetSystemRegistryDocument
  '\n  query GetResolvedGalleryDisplayPreferences(\n    $includeUser: Boolean!\n    $includeSpace: Boolean!\n    $userKeys: [String!]\n    $ownerID: String\n    $spaceID: String!\n    $systemKeys: [String!]!\n  ) {\n    userRegistryEntries: getUserRegistry(keys: $userKeys, ownerID: $ownerID)\n      @include(if: $includeUser) {\n      ...RegistryInfo\n    }\n    spaceRegistryEntries: spaceRegistry(spaceID: $spaceID, keys: $systemKeys)\n      @include(if: $includeSpace) {\n      ...RegistryInfo\n    }\n    systemRegistryEntries: getSystemRegistry(keys: $systemKeys) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.GetResolvedGalleryDisplayPreferencesDocument
  '\n  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {\n    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n': typeof types.SetUserRegistryDocument
  '\n  mutation DeleteUserRegistry($key: String!, $ownerID: String) {\n    deleteUserRegistry(key: $key, ownerID: $ownerID)\n  }\n': typeof types.DeleteUserRegistryDocument
  '\n  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {\n    setSystemRegistry(entry: $entry, entries: $entries) {\n      ...SystemRegistryInfo\n    }\n  }\n': typeof types.SetSystemRegistryDocument
  '\n  mutation DeleteSystemRegistry($key: String!) {\n    deleteSystemRegistry(key: $key)\n  }\n': typeof types.DeleteSystemRegistryDocument
  '\n  query LicenseStatus {\n    licenseStatus {\n      isLicensed\n      licenseType\n      email\n      message\n      isOverriddenByConfig\n      supportMessage\n      maskedLicenseKey\n      activatedAt\n    }\n  }\n': typeof types.LicenseStatusDocument
  '\n  query ListFiles(\n    $path: String!\n    $spaceID: String\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $extensions: String\n    $showHidden: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      spaceID: $spaceID\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      extensions: $extensions\n      showHidden: $showHidden\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        name\n        path\n        size\n        isDirectory\n        modifiedTime\n        thumbnailUrls {\n          grid\n          preview\n          full\n          original\n          meta\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.ListFilesDocument
  '\n  query StatFile($path: String!, $spaceID: String) {\n    statFile(path: $path, spaceID: $spaceID) {\n      name\n      path\n      size\n      isDirectory\n      modifiedTime\n      etag\n      thumbnailUrls {\n        grid\n        preview\n        full\n        original\n        meta\n      }\n    }\n  }\n': typeof types.StatFileDocument
  '\n  mutation UploadFile($path: String!, $spaceID: String, $content: Upload!) {\n    uploadFile(path: $path, spaceID: $spaceID, content: $content)\n  }\n': typeof types.UploadFileDocument
  '\n  mutation RequestUpload(\n    $path: String!\n    $spaceID: String\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    requestUpload(\n      path: $path\n      spaceID: $spaceID\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      uploadURL\n      expiresAt\n      requiredHeaders {\n        name\n        value\n      }\n    }\n  }\n': typeof types.RequestUploadDocument
  '\n  mutation CompleteUpload($path: String!, $spaceID: String) {\n    completeUpload(path: $path, spaceID: $spaceID)\n  }\n': typeof types.CompleteUploadDocument
  '\n  mutation DeleteFile($path: String!, $spaceID: String) {\n    deleteFile(path: $path, spaceID: $spaceID)\n  }\n': typeof types.DeleteFileDocument
  '\n  mutation CreateFolder($path: String!, $spaceID: String) {\n    createFolder(path: $path, spaceID: $spaceID)\n  }\n': typeof types.CreateFolderDocument
  '\n  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n': typeof types.CopyFileDocument
  '\n  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n': typeof types.MoveFileDocument
  '\n  query StorageStatus {\n    storageStatus {\n      configured\n      supportsPresignedUpload\n      type\n      lastUpdated\n      isOverriddenByConfig\n      fileConfig {\n        baseDir\n        mkdirPermissions\n        writePermissions\n      }\n      s3Config {\n        bucket\n        region\n        endpoint\n        forcePathStyle\n        baseDir\n      }\n    }\n  }\n': typeof types.StorageStatusDocument
  '\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n': typeof types.ConfigureFileStorageDocument
  '\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n': typeof types.ConfigureS3StorageDocument
  '\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n      code\n    }\n  }\n': typeof types.TestStorageConfigDocument
  '\n  mutation BeginStorageUploadProbe(\n    $input: StorageConfigInput!\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    beginStorageUploadProbe(\n      input: $input\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      probePath\n      uploadURL\n      expiresAt\n    }\n  }\n': typeof types.BeginStorageUploadProbeDocument
  '\n  mutation CompleteStorageUploadProbe(\n    $input: StorageConfigInput!\n    $probePath: String!\n    $expectedContent: String!\n  ) {\n    completeStorageUploadProbe(\n      input: $input\n      probePath: $probePath\n      expectedContent: $expectedContent\n    ) {\n      success\n      message\n      details\n      code\n    }\n  }\n': typeof types.CompleteStorageUploadProbeDocument
  '\n  mutation SaveTemplate($input: SaveTemplateInput!, $spaceID: String) {\n    saveTemplate(input: $input, spaceID: $spaceID) {\n      success\n      templatePath\n      message\n    }\n  }\n': typeof types.SaveTemplateDocument
  '\n  mutation RegenerateTemplatePreview($templatePath: String!, $spaceID: String) {\n    regenerateTemplatePreview(templatePath: $templatePath, spaceID: $spaceID)\n  }\n': typeof types.RegenerateTemplatePreviewDocument
  '\n  fragment UserInfo on User {\n    id\n    displayName\n    username\n    role\n    isActive\n    createdAt\n    updatedAt\n    email\n    pendingEmail\n    emailVerified\n    hasPassword\n    avatarUrl\n    authProviders {\n      provider\n      email\n      linkedAt\n    }\n  }\n': typeof types.UserInfoFragmentDoc
  '\n  query Me {\n    me {\n      ...UserInfo\n    }\n  }\n': typeof types.MeDocument
  '\n  query GetUser($id: ID!) {\n    user(id: $id) {\n      ...UserInfo\n    }\n  }\n': typeof types.GetUserDocument
  '\n  query ListUsers($offset: Int = 0, $limit: Int = 0, $search: String) {\n    users(offset: $offset, limit: $limit, search: $search) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n': typeof types.ListUsersDocument
  '\n  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {\n    updateProfile(input: $input, userId: $userId) {\n      ...UserInfo\n    }\n  }\n': typeof types.UpdateProfileDocument
  '\n  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {\n    changePassword(input: $input, userId: $userId)\n  }\n': typeof types.ChangePasswordDocument
  '\n  mutation RequestEmailChange($email: String!, $userId: ID) {\n    requestEmailChange(email: $email, userId: $userId) {\n      email\n      verificationRequired\n    }\n  }\n': typeof types.RequestEmailChangeDocument
  '\n  mutation UnlinkAuthProvider($provider: String!, $userId: ID) {\n    unlinkAuthProvider(provider: $provider, userId: $userId)\n  }\n': typeof types.UnlinkAuthProviderDocument
  '\n  mutation DeactivateAccount($userId: ID) {\n    deactivateAccount(userId: $userId)\n  }\n': typeof types.DeactivateAccountDocument
  '\n  mutation ReactivateAccount($userId: ID!) {\n    reactivateAccount(userId: $userId)\n  }\n': typeof types.ReactivateAccountDocument
  '\n  mutation CreateUser($input: CreateUserInput!) {\n    createUser(input: $input) {\n      ...UserInfo\n    }\n  }\n': typeof types.CreateUserDocument
}
const documents: Documents = {
  '\n  query ImagorStatus {\n    imagorStatus {\n      configured\n      lastUpdated\n      isOverriddenByConfig\n      config {\n        hasSecret\n        signerType\n        signerTruncate\n      }\n    }\n  }\n':
    types.ImagorStatusDocument,
  '\n  mutation ConfigureImagor($input: ImagorInput!) {\n    configureImagor(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n':
    types.ConfigureImagorDocument,
  '\n  mutation GenerateImagorUrl(\n    $imagePath: String!\n    $spaceID: String\n    $params: ImagorParamsInput!\n  ) {\n    generateImagorUrl(\n      imagePath: $imagePath\n      spaceID: $spaceID\n      params: $params\n    )\n  }\n':
    types.GenerateImagorUrlDocument,
  '\n  mutation GenerateImagorUrlFromTemplate(\n    $templateJson: String!\n    $spaceID: String\n    $contextPath: [String!]\n    $forPreview: Boolean\n    $previewMaxDimensions: DimensionsInput\n    $skipLayerId: String\n    $appendFilters: [ImagorFilterInput!]\n  ) {\n    generateImagorUrlFromTemplate(\n      templateJson: $templateJson\n      spaceID: $spaceID\n      contextPath: $contextPath\n      forPreview: $forPreview\n      previewMaxDimensions: $previewMaxDimensions\n      skipLayerId: $skipLayerId\n      appendFilters: $appendFilters\n    )\n  }\n':
    types.GenerateImagorUrlFromTemplateDocument,
  '\n  query MyOrganization {\n    myOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n':
    types.MyOrganizationDocument,
  '\n  query ListSpaces {\n    spaces {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      processingUsageCount\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n':
    types.ListSpacesDocument,
  '\n  query GetUsageSummary {\n    usageSummary {\n      usedSpaces\n      maxSpaces\n      usedHostedStorageBytes\n      storageLimitGB\n      usedTransforms\n      transformsLimit\n      periodStart\n      periodEnd\n    }\n  }\n':
    types.GetUsageSummaryDocument,
  '\n  mutation CreateCheckoutSession($plan: String!, $successURL: String!, $cancelURL: String!) {\n    createCheckoutSession(plan: $plan, successURL: $successURL, cancelURL: $cancelURL) {\n      url\n    }\n  }\n':
    types.CreateCheckoutSessionDocument,
  '\n  mutation CreateBillingPortalSession($returnURL: String!) {\n    createBillingPortalSession(returnURL: $returnURL) {\n      url\n    }\n  }\n':
    types.CreateBillingPortalSessionDocument,
  '\n  query GetSpace($key: String!) {\n    space(key: $key) {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n':
    types.GetSpaceDocument,
  '\n  mutation CreateSpace($input: SpaceInput!) {\n    createSpace(input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n':
    types.CreateSpaceDocument,
  '\n  mutation UpdateSpace($key: String!, $input: SpaceInput!) {\n    updateSpace(key: $key, input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n':
    types.UpdateSpaceDocument,
  '\n  mutation DeleteSpace($key: String!) {\n    deleteSpace(key: $key)\n  }\n':
    types.DeleteSpaceDocument,
  '\n  query GetSpaceRegistry($spaceID: String!, $keys: [String!]) {\n    spaceRegistry(spaceID: $spaceID, keys: $keys) {\n      key\n      value\n      isEncrypted\n    }\n  }\n':
    types.GetSpaceRegistryDocument,
  '\n  mutation SetSpaceRegistry($spaceID: String!, $entries: [RegistryEntryInput!]) {\n    setSpaceRegistry(spaceID: $spaceID, entries: $entries) {\n      key\n      value\n      isEncrypted\n    }\n  }\n':
    types.SetSpaceRegistryDocument,
  '\n  mutation DeleteSpaceRegistry($spaceID: String!, $keys: [String!]!) {\n    deleteSpaceRegistry(spaceID: $spaceID, keys: $keys)\n  }\n':
    types.DeleteSpaceRegistryDocument,
  '\n  query SpaceKeyExists($key: String!) {\n    spaceKeyExists(key: $key)\n  }\n':
    types.SpaceKeyExistsDocument,
  '\n  query ListOrgMembers {\n    orgMembers {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      createdAt\n    }\n  }\n':
    types.ListOrgMembersDocument,
  '\n  query ListOrgInvitations {\n    orgInvitations {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n':
    types.ListOrgInvitationsDocument,
  '\n  query ListSpaceMembers($spaceID: String!) {\n    spaceMembers(spaceID: $spaceID) {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      roleSource\n      canChangeRole\n      canRemove\n      createdAt\n    }\n  }\n':
    types.ListSpaceMembersDocument,
  '\n  query ListSpaceInvitations($spaceID: String!) {\n    spaceInvitations(spaceID: $spaceID) {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n':
    types.ListSpaceInvitationsDocument,
  '\n  mutation AddOrgMember($username: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMember(username: $username, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n':
    types.AddOrgMemberDocument,
  '\n  mutation AddOrgMemberByEmail($email: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMemberByEmail(email: $email, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n':
    types.AddOrgMemberByEmailDocument,
  '\n  mutation InviteOrgMember($email: String!, $role: OrgMemberAssignableRole!) {\n    inviteOrgMember(email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n':
    types.InviteOrgMemberDocument,
  '\n  mutation CancelOrgInvitation($invitationId: ID!) {\n    cancelOrgInvitation(invitationId: $invitationId)\n  }\n':
    types.CancelOrgInvitationDocument,
  '\n  mutation AddSpaceMember($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    addSpaceMember(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n':
    types.AddSpaceMemberDocument,
  '\n  mutation InviteSpaceMember($spaceID: String!, $email: String!, $role: SpaceMemberAssignableRole!) {\n    inviteSpaceMember(spaceID: $spaceID, email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n':
    types.InviteSpaceMemberDocument,
  '\n  mutation RemoveOrgMember($userId: ID!) {\n    removeOrgMember(userId: $userId)\n  }\n':
    types.RemoveOrgMemberDocument,
  '\n  mutation LeaveOrganization {\n    leaveOrganization\n  }\n': types.LeaveOrganizationDocument,
  '\n  mutation DeleteOrganization {\n    deleteOrganization\n  }\n':
    types.DeleteOrganizationDocument,
  '\n  mutation CreateOrganization {\n    createOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n':
    types.CreateOrganizationDocument,
  '\n  mutation RemoveSpaceMember($spaceID: String!, $userId: ID!) {\n    removeSpaceMember(spaceID: $spaceID, userId: $userId)\n  }\n':
    types.RemoveSpaceMemberDocument,
  '\n  mutation LeaveSpace($spaceID: String!) {\n    leaveSpace(spaceID: $spaceID)\n  }\n':
    types.LeaveSpaceDocument,
  '\n  mutation UpdateOrgMemberRole($userId: ID!, $role: OrgMemberAssignableRole!) {\n    updateOrgMemberRole(userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n':
    types.UpdateOrgMemberRoleDocument,
  '\n  mutation TransferOrganizationOwnership($userId: ID!) {\n    transferOrganizationOwnership(userId: $userId) {\n      id\n      ownerUserId\n      updatedAt\n    }\n  }\n':
    types.TransferOrganizationOwnershipDocument,
  '\n  mutation UpdateSpaceMemberRole($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    updateSpaceMemberRole(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n':
    types.UpdateSpaceMemberRoleDocument,
  '\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    isEncrypted\n  }\n':
    types.RegistryInfoFragmentDoc,
  '\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    isEncrypted\n    isOverriddenByConfig\n  }\n':
    types.SystemRegistryInfoFragmentDoc,
  '\n  query ListUserRegistry($prefix: String, $ownerID: String) {\n    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n':
    types.ListUserRegistryDocument,
  '\n  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {\n    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n':
    types.GetUserRegistryDocument,
  '\n  query ListSystemRegistry($prefix: String) {\n    listSystemRegistry(prefix: $prefix) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.ListSystemRegistryDocument,
  '\n  query GetSystemRegistry($key: String, $keys: [String!]) {\n    getSystemRegistry(key: $key, keys: $keys) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.GetSystemRegistryDocument,
  '\n  query GetResolvedGalleryDisplayPreferences(\n    $includeUser: Boolean!\n    $includeSpace: Boolean!\n    $userKeys: [String!]\n    $ownerID: String\n    $spaceID: String!\n    $systemKeys: [String!]!\n  ) {\n    userRegistryEntries: getUserRegistry(keys: $userKeys, ownerID: $ownerID)\n      @include(if: $includeUser) {\n      ...RegistryInfo\n    }\n    spaceRegistryEntries: spaceRegistry(spaceID: $spaceID, keys: $systemKeys)\n      @include(if: $includeSpace) {\n      ...RegistryInfo\n    }\n    systemRegistryEntries: getSystemRegistry(keys: $systemKeys) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.GetResolvedGalleryDisplayPreferencesDocument,
  '\n  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {\n    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {\n      ...RegistryInfo\n    }\n  }\n':
    types.SetUserRegistryDocument,
  '\n  mutation DeleteUserRegistry($key: String!, $ownerID: String) {\n    deleteUserRegistry(key: $key, ownerID: $ownerID)\n  }\n':
    types.DeleteUserRegistryDocument,
  '\n  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {\n    setSystemRegistry(entry: $entry, entries: $entries) {\n      ...SystemRegistryInfo\n    }\n  }\n':
    types.SetSystemRegistryDocument,
  '\n  mutation DeleteSystemRegistry($key: String!) {\n    deleteSystemRegistry(key: $key)\n  }\n':
    types.DeleteSystemRegistryDocument,
  '\n  query LicenseStatus {\n    licenseStatus {\n      isLicensed\n      licenseType\n      email\n      message\n      isOverriddenByConfig\n      supportMessage\n      maskedLicenseKey\n      activatedAt\n    }\n  }\n':
    types.LicenseStatusDocument,
  '\n  query ListFiles(\n    $path: String!\n    $spaceID: String\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $extensions: String\n    $showHidden: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      spaceID: $spaceID\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      extensions: $extensions\n      showHidden: $showHidden\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        name\n        path\n        size\n        isDirectory\n        modifiedTime\n        thumbnailUrls {\n          grid\n          preview\n          full\n          original\n          meta\n        }\n      }\n      totalCount\n    }\n  }\n':
    types.ListFilesDocument,
  '\n  query StatFile($path: String!, $spaceID: String) {\n    statFile(path: $path, spaceID: $spaceID) {\n      name\n      path\n      size\n      isDirectory\n      modifiedTime\n      etag\n      thumbnailUrls {\n        grid\n        preview\n        full\n        original\n        meta\n      }\n    }\n  }\n':
    types.StatFileDocument,
  '\n  mutation UploadFile($path: String!, $spaceID: String, $content: Upload!) {\n    uploadFile(path: $path, spaceID: $spaceID, content: $content)\n  }\n':
    types.UploadFileDocument,
  '\n  mutation RequestUpload(\n    $path: String!\n    $spaceID: String\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    requestUpload(\n      path: $path\n      spaceID: $spaceID\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      uploadURL\n      expiresAt\n      requiredHeaders {\n        name\n        value\n      }\n    }\n  }\n':
    types.RequestUploadDocument,
  '\n  mutation CompleteUpload($path: String!, $spaceID: String) {\n    completeUpload(path: $path, spaceID: $spaceID)\n  }\n':
    types.CompleteUploadDocument,
  '\n  mutation DeleteFile($path: String!, $spaceID: String) {\n    deleteFile(path: $path, spaceID: $spaceID)\n  }\n':
    types.DeleteFileDocument,
  '\n  mutation CreateFolder($path: String!, $spaceID: String) {\n    createFolder(path: $path, spaceID: $spaceID)\n  }\n':
    types.CreateFolderDocument,
  '\n  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n':
    types.CopyFileDocument,
  '\n  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n':
    types.MoveFileDocument,
  '\n  query StorageStatus {\n    storageStatus {\n      configured\n      supportsPresignedUpload\n      type\n      lastUpdated\n      isOverriddenByConfig\n      fileConfig {\n        baseDir\n        mkdirPermissions\n        writePermissions\n      }\n      s3Config {\n        bucket\n        region\n        endpoint\n        forcePathStyle\n        baseDir\n      }\n    }\n  }\n':
    types.StorageStatusDocument,
  '\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n':
    types.ConfigureFileStorageDocument,
  '\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n':
    types.ConfigureS3StorageDocument,
  '\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n      code\n    }\n  }\n':
    types.TestStorageConfigDocument,
  '\n  mutation BeginStorageUploadProbe(\n    $input: StorageConfigInput!\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    beginStorageUploadProbe(\n      input: $input\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      probePath\n      uploadURL\n      expiresAt\n    }\n  }\n':
    types.BeginStorageUploadProbeDocument,
  '\n  mutation CompleteStorageUploadProbe(\n    $input: StorageConfigInput!\n    $probePath: String!\n    $expectedContent: String!\n  ) {\n    completeStorageUploadProbe(\n      input: $input\n      probePath: $probePath\n      expectedContent: $expectedContent\n    ) {\n      success\n      message\n      details\n      code\n    }\n  }\n':
    types.CompleteStorageUploadProbeDocument,
  '\n  mutation SaveTemplate($input: SaveTemplateInput!, $spaceID: String) {\n    saveTemplate(input: $input, spaceID: $spaceID) {\n      success\n      templatePath\n      message\n    }\n  }\n':
    types.SaveTemplateDocument,
  '\n  mutation RegenerateTemplatePreview($templatePath: String!, $spaceID: String) {\n    regenerateTemplatePreview(templatePath: $templatePath, spaceID: $spaceID)\n  }\n':
    types.RegenerateTemplatePreviewDocument,
  '\n  fragment UserInfo on User {\n    id\n    displayName\n    username\n    role\n    isActive\n    createdAt\n    updatedAt\n    email\n    pendingEmail\n    emailVerified\n    hasPassword\n    avatarUrl\n    authProviders {\n      provider\n      email\n      linkedAt\n    }\n  }\n':
    types.UserInfoFragmentDoc,
  '\n  query Me {\n    me {\n      ...UserInfo\n    }\n  }\n': types.MeDocument,
  '\n  query GetUser($id: ID!) {\n    user(id: $id) {\n      ...UserInfo\n    }\n  }\n':
    types.GetUserDocument,
  '\n  query ListUsers($offset: Int = 0, $limit: Int = 0, $search: String) {\n    users(offset: $offset, limit: $limit, search: $search) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n':
    types.ListUsersDocument,
  '\n  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {\n    updateProfile(input: $input, userId: $userId) {\n      ...UserInfo\n    }\n  }\n':
    types.UpdateProfileDocument,
  '\n  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {\n    changePassword(input: $input, userId: $userId)\n  }\n':
    types.ChangePasswordDocument,
  '\n  mutation RequestEmailChange($email: String!, $userId: ID) {\n    requestEmailChange(email: $email, userId: $userId) {\n      email\n      verificationRequired\n    }\n  }\n':
    types.RequestEmailChangeDocument,
  '\n  mutation UnlinkAuthProvider($provider: String!, $userId: ID) {\n    unlinkAuthProvider(provider: $provider, userId: $userId)\n  }\n':
    types.UnlinkAuthProviderDocument,
  '\n  mutation DeactivateAccount($userId: ID) {\n    deactivateAccount(userId: $userId)\n  }\n':
    types.DeactivateAccountDocument,
  '\n  mutation ReactivateAccount($userId: ID!) {\n    reactivateAccount(userId: $userId)\n  }\n':
    types.ReactivateAccountDocument,
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
  source: '\n  query ImagorStatus {\n    imagorStatus {\n      configured\n      lastUpdated\n      isOverriddenByConfig\n      config {\n        hasSecret\n        signerType\n        signerTruncate\n      }\n    }\n  }\n',
): (typeof documents)['\n  query ImagorStatus {\n    imagorStatus {\n      configured\n      lastUpdated\n      isOverriddenByConfig\n      config {\n        hasSecret\n        signerType\n        signerTruncate\n      }\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation ConfigureImagor($input: ImagorInput!) {\n    configureImagor(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n',
): (typeof documents)['\n  mutation ConfigureImagor($input: ImagorInput!) {\n    configureImagor(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation GenerateImagorUrl(\n    $imagePath: String!\n    $spaceID: String\n    $params: ImagorParamsInput!\n  ) {\n    generateImagorUrl(\n      imagePath: $imagePath\n      spaceID: $spaceID\n      params: $params\n    )\n  }\n',
): (typeof documents)['\n  mutation GenerateImagorUrl(\n    $imagePath: String!\n    $spaceID: String\n    $params: ImagorParamsInput!\n  ) {\n    generateImagorUrl(\n      imagePath: $imagePath\n      spaceID: $spaceID\n      params: $params\n    )\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation GenerateImagorUrlFromTemplate(\n    $templateJson: String!\n    $spaceID: String\n    $contextPath: [String!]\n    $forPreview: Boolean\n    $previewMaxDimensions: DimensionsInput\n    $skipLayerId: String\n    $appendFilters: [ImagorFilterInput!]\n  ) {\n    generateImagorUrlFromTemplate(\n      templateJson: $templateJson\n      spaceID: $spaceID\n      contextPath: $contextPath\n      forPreview: $forPreview\n      previewMaxDimensions: $previewMaxDimensions\n      skipLayerId: $skipLayerId\n      appendFilters: $appendFilters\n    )\n  }\n',
): (typeof documents)['\n  mutation GenerateImagorUrlFromTemplate(\n    $templateJson: String!\n    $spaceID: String\n    $contextPath: [String!]\n    $forPreview: Boolean\n    $previewMaxDimensions: DimensionsInput\n    $skipLayerId: String\n    $appendFilters: [ImagorFilterInput!]\n  ) {\n    generateImagorUrlFromTemplate(\n      templateJson: $templateJson\n      spaceID: $spaceID\n      contextPath: $contextPath\n      forPreview: $forPreview\n      previewMaxDimensions: $previewMaxDimensions\n      skipLayerId: $skipLayerId\n      appendFilters: $appendFilters\n    )\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query MyOrganization {\n    myOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  query MyOrganization {\n    myOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListSpaces {\n    spaces {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      processingUsageCount\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  query ListSpaces {\n    spaces {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      processingUsageCount\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetUsageSummary {\n    usageSummary {\n      usedSpaces\n      maxSpaces\n      usedHostedStorageBytes\n      storageLimitGB\n      usedTransforms\n      transformsLimit\n      periodStart\n      periodEnd\n    }\n  }\n',
): (typeof documents)['\n  query GetUsageSummary {\n    usageSummary {\n      usedSpaces\n      maxSpaces\n      usedHostedStorageBytes\n      storageLimitGB\n      usedTransforms\n      transformsLimit\n      periodStart\n      periodEnd\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateCheckoutSession($plan: String!, $successURL: String!, $cancelURL: String!) {\n    createCheckoutSession(plan: $plan, successURL: $successURL, cancelURL: $cancelURL) {\n      url\n    }\n  }\n',
): (typeof documents)['\n  mutation CreateCheckoutSession($plan: String!, $successURL: String!, $cancelURL: String!) {\n    createCheckoutSession(plan: $plan, successURL: $successURL, cancelURL: $cancelURL) {\n      url\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateBillingPortalSession($returnURL: String!) {\n    createBillingPortalSession(returnURL: $returnURL) {\n      url\n    }\n  }\n',
): (typeof documents)['\n  mutation CreateBillingPortalSession($returnURL: String!) {\n    createBillingPortalSession(returnURL: $returnURL) {\n      url\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetSpace($key: String!) {\n    space(key: $key) {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  query GetSpace($key: String!) {\n    space(key: $key) {\n      id\n      orgId\n      key\n      name\n      storageUsageBytes\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      customDomainVerified\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      hasCustomImagorSecret\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateSpace($input: SpaceInput!) {\n    createSpace(input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  mutation CreateSpace($input: SpaceInput!) {\n    createSpace(input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UpdateSpace($key: String!, $input: SpaceInput!) {\n    updateSpace(key: $key, input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  mutation UpdateSpace($key: String!, $input: SpaceInput!) {\n    updateSpace(key: $key, input: $input) {\n      orgId\n      key\n      name\n      storageMode\n      storageType\n      bucket\n      prefix\n      region\n      endpoint\n      usePathStyle\n      customDomain\n      suspended\n      isShared\n      signerAlgorithm\n      signerTruncate\n      imagorCORSOrigins\n      canManage\n      canDelete\n      canLeave\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteSpace($key: String!) {\n    deleteSpace(key: $key)\n  }\n',
): (typeof documents)['\n  mutation DeleteSpace($key: String!) {\n    deleteSpace(key: $key)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query GetSpaceRegistry($spaceID: String!, $keys: [String!]) {\n    spaceRegistry(spaceID: $spaceID, keys: $keys) {\n      key\n      value\n      isEncrypted\n    }\n  }\n',
): (typeof documents)['\n  query GetSpaceRegistry($spaceID: String!, $keys: [String!]) {\n    spaceRegistry(spaceID: $spaceID, keys: $keys) {\n      key\n      value\n      isEncrypted\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation SetSpaceRegistry($spaceID: String!, $entries: [RegistryEntryInput!]) {\n    setSpaceRegistry(spaceID: $spaceID, entries: $entries) {\n      key\n      value\n      isEncrypted\n    }\n  }\n',
): (typeof documents)['\n  mutation SetSpaceRegistry($spaceID: String!, $entries: [RegistryEntryInput!]) {\n    setSpaceRegistry(spaceID: $spaceID, entries: $entries) {\n      key\n      value\n      isEncrypted\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteSpaceRegistry($spaceID: String!, $keys: [String!]!) {\n    deleteSpaceRegistry(spaceID: $spaceID, keys: $keys)\n  }\n',
): (typeof documents)['\n  mutation DeleteSpaceRegistry($spaceID: String!, $keys: [String!]!) {\n    deleteSpaceRegistry(spaceID: $spaceID, keys: $keys)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query SpaceKeyExists($key: String!) {\n    spaceKeyExists(key: $key)\n  }\n',
): (typeof documents)['\n  query SpaceKeyExists($key: String!) {\n    spaceKeyExists(key: $key)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListOrgMembers {\n    orgMembers {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  query ListOrgMembers {\n    orgMembers {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListOrgInvitations {\n    orgInvitations {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n',
): (typeof documents)['\n  query ListOrgInvitations {\n    orgInvitations {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListSpaceMembers($spaceID: String!) {\n    spaceMembers(spaceID: $spaceID) {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      roleSource\n      canChangeRole\n      canRemove\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  query ListSpaceMembers($spaceID: String!) {\n    spaceMembers(spaceID: $spaceID) {\n      userId\n      username\n      displayName\n      email\n      avatarUrl\n      role\n      roleSource\n      canChangeRole\n      canRemove\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListSpaceInvitations($spaceID: String!) {\n    spaceInvitations(spaceID: $spaceID) {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n',
): (typeof documents)['\n  query ListSpaceInvitations($spaceID: String!) {\n    spaceInvitations(spaceID: $spaceID) {\n      id\n      email\n      role\n      createdAt\n      expiresAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation AddOrgMember($username: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMember(username: $username, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  mutation AddOrgMember($username: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMember(username: $username, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation AddOrgMemberByEmail($email: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMemberByEmail(email: $email, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  mutation AddOrgMemberByEmail($email: String!, $role: OrgMemberAssignableRole!) {\n    addOrgMemberByEmail(email: $email, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation InviteOrgMember($email: String!, $role: OrgMemberAssignableRole!) {\n    inviteOrgMember(email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n',
): (typeof documents)['\n  mutation InviteOrgMember($email: String!, $role: OrgMemberAssignableRole!) {\n    inviteOrgMember(email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CancelOrgInvitation($invitationId: ID!) {\n    cancelOrgInvitation(invitationId: $invitationId)\n  }\n',
): (typeof documents)['\n  mutation CancelOrgInvitation($invitationId: ID!) {\n    cancelOrgInvitation(invitationId: $invitationId)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation AddSpaceMember($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    addSpaceMember(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  mutation AddSpaceMember($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    addSpaceMember(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation InviteSpaceMember($spaceID: String!, $email: String!, $role: SpaceMemberAssignableRole!) {\n    inviteSpaceMember(spaceID: $spaceID, email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n',
): (typeof documents)['\n  mutation InviteSpaceMember($spaceID: String!, $email: String!, $role: SpaceMemberAssignableRole!) {\n    inviteSpaceMember(spaceID: $spaceID, email: $email, role: $role) {\n      status\n      member {\n        userId\n        username\n        displayName\n        role\n        createdAt\n      }\n      invitation {\n        id\n        email\n        role\n        createdAt\n        expiresAt\n      }\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation RemoveOrgMember($userId: ID!) {\n    removeOrgMember(userId: $userId)\n  }\n',
): (typeof documents)['\n  mutation RemoveOrgMember($userId: ID!) {\n    removeOrgMember(userId: $userId)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation LeaveOrganization {\n    leaveOrganization\n  }\n',
): (typeof documents)['\n  mutation LeaveOrganization {\n    leaveOrganization\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteOrganization {\n    deleteOrganization\n  }\n',
): (typeof documents)['\n  mutation DeleteOrganization {\n    deleteOrganization\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateOrganization {\n    createOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  mutation CreateOrganization {\n    createOrganization {\n      id\n      name\n      slug\n      ownerUserId\n      currentUserRole\n      plan\n      planStatus\n      createdAt\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation RemoveSpaceMember($spaceID: String!, $userId: ID!) {\n    removeSpaceMember(spaceID: $spaceID, userId: $userId)\n  }\n',
): (typeof documents)['\n  mutation RemoveSpaceMember($spaceID: String!, $userId: ID!) {\n    removeSpaceMember(spaceID: $spaceID, userId: $userId)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation LeaveSpace($spaceID: String!) {\n    leaveSpace(spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation LeaveSpace($spaceID: String!) {\n    leaveSpace(spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UpdateOrgMemberRole($userId: ID!, $role: OrgMemberAssignableRole!) {\n    updateOrgMemberRole(userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  mutation UpdateOrgMemberRole($userId: ID!, $role: OrgMemberAssignableRole!) {\n    updateOrgMemberRole(userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation TransferOrganizationOwnership($userId: ID!) {\n    transferOrganizationOwnership(userId: $userId) {\n      id\n      ownerUserId\n      updatedAt\n    }\n  }\n',
): (typeof documents)['\n  mutation TransferOrganizationOwnership($userId: ID!) {\n    transferOrganizationOwnership(userId: $userId) {\n      id\n      ownerUserId\n      updatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UpdateSpaceMemberRole($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    updateSpaceMemberRole(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n',
): (typeof documents)['\n  mutation UpdateSpaceMemberRole($spaceID: String!, $userId: ID!, $role: SpaceMemberAssignableRole!) {\n    updateSpaceMemberRole(spaceID: $spaceID, userId: $userId, role: $role) {\n      userId\n      username\n      displayName\n      role\n      createdAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    isEncrypted\n  }\n',
): (typeof documents)['\n  fragment RegistryInfo on UserRegistry {\n    key\n    value\n    isEncrypted\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    isEncrypted\n    isOverriddenByConfig\n  }\n',
): (typeof documents)['\n  fragment SystemRegistryInfo on SystemRegistry {\n    key\n    value\n    isEncrypted\n    isOverriddenByConfig\n  }\n']
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
  source: '\n  query GetResolvedGalleryDisplayPreferences(\n    $includeUser: Boolean!\n    $includeSpace: Boolean!\n    $userKeys: [String!]\n    $ownerID: String\n    $spaceID: String!\n    $systemKeys: [String!]!\n  ) {\n    userRegistryEntries: getUserRegistry(keys: $userKeys, ownerID: $ownerID)\n      @include(if: $includeUser) {\n      ...RegistryInfo\n    }\n    spaceRegistryEntries: spaceRegistry(spaceID: $spaceID, keys: $systemKeys)\n      @include(if: $includeSpace) {\n      ...RegistryInfo\n    }\n    systemRegistryEntries: getSystemRegistry(keys: $systemKeys) {\n      ...SystemRegistryInfo\n    }\n  }\n',
): (typeof documents)['\n  query GetResolvedGalleryDisplayPreferences(\n    $includeUser: Boolean!\n    $includeSpace: Boolean!\n    $userKeys: [String!]\n    $ownerID: String\n    $spaceID: String!\n    $systemKeys: [String!]!\n  ) {\n    userRegistryEntries: getUserRegistry(keys: $userKeys, ownerID: $ownerID)\n      @include(if: $includeUser) {\n      ...RegistryInfo\n    }\n    spaceRegistryEntries: spaceRegistry(spaceID: $spaceID, keys: $systemKeys)\n      @include(if: $includeSpace) {\n      ...RegistryInfo\n    }\n    systemRegistryEntries: getSystemRegistry(keys: $systemKeys) {\n      ...SystemRegistryInfo\n    }\n  }\n']
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
  source: '\n  query LicenseStatus {\n    licenseStatus {\n      isLicensed\n      licenseType\n      email\n      message\n      isOverriddenByConfig\n      supportMessage\n      maskedLicenseKey\n      activatedAt\n    }\n  }\n',
): (typeof documents)['\n  query LicenseStatus {\n    licenseStatus {\n      isLicensed\n      licenseType\n      email\n      message\n      isOverriddenByConfig\n      supportMessage\n      maskedLicenseKey\n      activatedAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query ListFiles(\n    $path: String!\n    $spaceID: String\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $extensions: String\n    $showHidden: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      spaceID: $spaceID\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      extensions: $extensions\n      showHidden: $showHidden\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        name\n        path\n        size\n        isDirectory\n        modifiedTime\n        thumbnailUrls {\n          grid\n          preview\n          full\n          original\n          meta\n        }\n      }\n      totalCount\n    }\n  }\n',
): (typeof documents)['\n  query ListFiles(\n    $path: String!\n    $spaceID: String\n    $offset: Int\n    $limit: Int\n    $onlyFiles: Boolean\n    $onlyFolders: Boolean\n    $extensions: String\n    $showHidden: Boolean\n    $sortBy: SortOption\n    $sortOrder: SortOrder\n  ) {\n    listFiles(\n      path: $path\n      spaceID: $spaceID\n      offset: $offset\n      limit: $limit\n      onlyFiles: $onlyFiles\n      onlyFolders: $onlyFolders\n      extensions: $extensions\n      showHidden: $showHidden\n      sortBy: $sortBy\n      sortOrder: $sortOrder\n    ) {\n      items {\n        name\n        path\n        size\n        isDirectory\n        modifiedTime\n        thumbnailUrls {\n          grid\n          preview\n          full\n          original\n          meta\n        }\n      }\n      totalCount\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query StatFile($path: String!, $spaceID: String) {\n    statFile(path: $path, spaceID: $spaceID) {\n      name\n      path\n      size\n      isDirectory\n      modifiedTime\n      etag\n      thumbnailUrls {\n        grid\n        preview\n        full\n        original\n        meta\n      }\n    }\n  }\n',
): (typeof documents)['\n  query StatFile($path: String!, $spaceID: String) {\n    statFile(path: $path, spaceID: $spaceID) {\n      name\n      path\n      size\n      isDirectory\n      modifiedTime\n      etag\n      thumbnailUrls {\n        grid\n        preview\n        full\n        original\n        meta\n      }\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UploadFile($path: String!, $spaceID: String, $content: Upload!) {\n    uploadFile(path: $path, spaceID: $spaceID, content: $content)\n  }\n',
): (typeof documents)['\n  mutation UploadFile($path: String!, $spaceID: String, $content: Upload!) {\n    uploadFile(path: $path, spaceID: $spaceID, content: $content)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation RequestUpload(\n    $path: String!\n    $spaceID: String\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    requestUpload(\n      path: $path\n      spaceID: $spaceID\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      uploadURL\n      expiresAt\n      requiredHeaders {\n        name\n        value\n      }\n    }\n  }\n',
): (typeof documents)['\n  mutation RequestUpload(\n    $path: String!\n    $spaceID: String\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    requestUpload(\n      path: $path\n      spaceID: $spaceID\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      uploadURL\n      expiresAt\n      requiredHeaders {\n        name\n        value\n      }\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CompleteUpload($path: String!, $spaceID: String) {\n    completeUpload(path: $path, spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation CompleteUpload($path: String!, $spaceID: String) {\n    completeUpload(path: $path, spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation DeleteFile($path: String!, $spaceID: String) {\n    deleteFile(path: $path, spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation DeleteFile($path: String!, $spaceID: String) {\n    deleteFile(path: $path, spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CreateFolder($path: String!, $spaceID: String) {\n    createFolder(path: $path, spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation CreateFolder($path: String!, $spaceID: String) {\n    createFolder(path: $path, spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation CopyFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    copyFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation MoveFile($sourcePath: String!, $destPath: String!, $spaceID: String) {\n    moveFile(sourcePath: $sourcePath, destPath: $destPath, spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query StorageStatus {\n    storageStatus {\n      configured\n      supportsPresignedUpload\n      type\n      lastUpdated\n      isOverriddenByConfig\n      fileConfig {\n        baseDir\n        mkdirPermissions\n        writePermissions\n      }\n      s3Config {\n        bucket\n        region\n        endpoint\n        forcePathStyle\n        baseDir\n      }\n    }\n  }\n',
): (typeof documents)['\n  query StorageStatus {\n    storageStatus {\n      configured\n      supportsPresignedUpload\n      type\n      lastUpdated\n      isOverriddenByConfig\n      fileConfig {\n        baseDir\n        mkdirPermissions\n        writePermissions\n      }\n      s3Config {\n        bucket\n        region\n        endpoint\n        forcePathStyle\n        baseDir\n      }\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n',
): (typeof documents)['\n  mutation ConfigureFileStorage($input: FileStorageInput!) {\n    configureFileStorage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n',
): (typeof documents)['\n  mutation ConfigureS3Storage($input: S3StorageInput!) {\n    configureS3Storage(input: $input) {\n      success\n      timestamp\n      message\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n      code\n    }\n  }\n',
): (typeof documents)['\n  mutation TestStorageConfig($input: StorageConfigInput!) {\n    testStorageConfig(input: $input) {\n      success\n      message\n      details\n      code\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation BeginStorageUploadProbe(\n    $input: StorageConfigInput!\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    beginStorageUploadProbe(\n      input: $input\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      probePath\n      uploadURL\n      expiresAt\n    }\n  }\n',
): (typeof documents)['\n  mutation BeginStorageUploadProbe(\n    $input: StorageConfigInput!\n    $contentType: String!\n    $sizeBytes: Int!\n  ) {\n    beginStorageUploadProbe(\n      input: $input\n      contentType: $contentType\n      sizeBytes: $sizeBytes\n    ) {\n      probePath\n      uploadURL\n      expiresAt\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation CompleteStorageUploadProbe(\n    $input: StorageConfigInput!\n    $probePath: String!\n    $expectedContent: String!\n  ) {\n    completeStorageUploadProbe(\n      input: $input\n      probePath: $probePath\n      expectedContent: $expectedContent\n    ) {\n      success\n      message\n      details\n      code\n    }\n  }\n',
): (typeof documents)['\n  mutation CompleteStorageUploadProbe(\n    $input: StorageConfigInput!\n    $probePath: String!\n    $expectedContent: String!\n  ) {\n    completeStorageUploadProbe(\n      input: $input\n      probePath: $probePath\n      expectedContent: $expectedContent\n    ) {\n      success\n      message\n      details\n      code\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation SaveTemplate($input: SaveTemplateInput!, $spaceID: String) {\n    saveTemplate(input: $input, spaceID: $spaceID) {\n      success\n      templatePath\n      message\n    }\n  }\n',
): (typeof documents)['\n  mutation SaveTemplate($input: SaveTemplateInput!, $spaceID: String) {\n    saveTemplate(input: $input, spaceID: $spaceID) {\n      success\n      templatePath\n      message\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation RegenerateTemplatePreview($templatePath: String!, $spaceID: String) {\n    regenerateTemplatePreview(templatePath: $templatePath, spaceID: $spaceID)\n  }\n',
): (typeof documents)['\n  mutation RegenerateTemplatePreview($templatePath: String!, $spaceID: String) {\n    regenerateTemplatePreview(templatePath: $templatePath, spaceID: $spaceID)\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment UserInfo on User {\n    id\n    displayName\n    username\n    role\n    isActive\n    createdAt\n    updatedAt\n    email\n    pendingEmail\n    emailVerified\n    hasPassword\n    avatarUrl\n    authProviders {\n      provider\n      email\n      linkedAt\n    }\n  }\n',
): (typeof documents)['\n  fragment UserInfo on User {\n    id\n    displayName\n    username\n    role\n    isActive\n    createdAt\n    updatedAt\n    email\n    pendingEmail\n    emailVerified\n    hasPassword\n    avatarUrl\n    authProviders {\n      provider\n      email\n      linkedAt\n    }\n  }\n']
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
  source: '\n  query ListUsers($offset: Int = 0, $limit: Int = 0, $search: String) {\n    users(offset: $offset, limit: $limit, search: $search) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n',
): (typeof documents)['\n  query ListUsers($offset: Int = 0, $limit: Int = 0, $search: String) {\n    users(offset: $offset, limit: $limit, search: $search) {\n      items {\n        ...UserInfo\n      }\n      totalCount\n    }\n  }\n']
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
  source: '\n  mutation RequestEmailChange($email: String!, $userId: ID) {\n    requestEmailChange(email: $email, userId: $userId) {\n      email\n      verificationRequired\n    }\n  }\n',
): (typeof documents)['\n  mutation RequestEmailChange($email: String!, $userId: ID) {\n    requestEmailChange(email: $email, userId: $userId) {\n      email\n      verificationRequired\n    }\n  }\n']
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  mutation UnlinkAuthProvider($provider: String!, $userId: ID) {\n    unlinkAuthProvider(provider: $provider, userId: $userId)\n  }\n',
): (typeof documents)['\n  mutation UnlinkAuthProvider($provider: String!, $userId: ID) {\n    unlinkAuthProvider(provider: $provider, userId: $userId)\n  }\n']
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
  source: '\n  mutation ReactivateAccount($userId: ID!) {\n    reactivateAccount(userId: $userId)\n  }\n',
): (typeof documents)['\n  mutation ReactivateAccount($userId: ID!) {\n    reactivateAccount(userId: $userId)\n  }\n']
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
