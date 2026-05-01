import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MyOrganizationQuery } from '@/generated/graphql'

const mockGetMyOrganization = vi.fn()
const mockGetSpace = vi.fn()
const mockGetUsageSummary = vi.fn()
const mockListOrgInvitations = vi.fn()
const mockListOrgMembers = vi.fn()
const mockListSpaces = vi.fn()

vi.mock('@/api/imagor-api', () => ({
  getImagorStatus: vi.fn(),
}))

vi.mock('@/api/license-api', () => ({
  getLicenseStatus: vi.fn(),
}))

vi.mock('@/api/org-api', async () => {
  const actual = await vi.importActual<typeof import('@/api/org-api')>('@/api/org-api')
  return {
    ...actual,
    getMyOrganization: mockGetMyOrganization,
    getSpace: mockGetSpace,
    getUsageSummary: mockGetUsageSummary,
    listOrgInvitations: mockListOrgInvitations,
    listOrgMembers: mockListOrgMembers,
    listSpaces: mockListSpaces,
  }
})

vi.mock('@/api/registry-api', () => ({
  getSystemRegistryObject: vi.fn(),
  listSystemRegistry: vi.fn(),
}))

vi.mock('@/api/storage-api', () => ({
  getStorageStatus: vi.fn(),
}))

vi.mock('@/api/user-api', () => ({
  listUsers: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  getAuth: vi.fn(),
}))

describe('account-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes current organization id in spaces loader data', async () => {
    const { spacesLoader } = await import('@/loaders/account-loader')

    mockListSpaces.mockResolvedValue([
      {
        __typename: 'Space',
        id: 'space-acme',
        orgId: 'org-1',
        key: 'acme',
        name: 'Acme',
        storageUsageBytes: 1024,
        processingUsageCount: 10,
        storageMode: 'platform',
        storageType: 'managed',
        bucket: '',
        prefix: '',
        region: '',
        endpoint: '',
        usePathStyle: false,
        customDomain: '',
        customDomainVerified: false,
        suspended: false,
        isShared: false,
        signerAlgorithm: 'sha256',
        signerTruncate: 32,
        imagorCORSOrigins: '',
        canManage: true,
        canDelete: true,
        canLeave: false,
        updatedAt: '2026-04-18T00:00:00Z',
      },
    ])
    mockGetMyOrganization.mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'owner',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })
    mockGetUsageSummary.mockResolvedValue({
      __typename: 'UsageSummary',
      usedSpaces: 1,
      maxSpaces: 1,
      usedHostedStorageBytes: 1024,
      storageLimitGB: 1,
      usedTransforms: 10,
      transformsLimit: 1000,
      periodStart: '2026-04-01T00:00:00Z',
      periodEnd: '2026-05-01T00:00:00Z',
    })

    const result = await spacesLoader()

    expect(result.currentOrganizationId).toBe('org-1')
    expect(result.spaces).toHaveLength(1)
  })

  it('allows spaces loader to return direct-member spaces for authenticated users with no organization', async () => {
    const { spacesLoader } = await import('@/loaders/account-loader')

    mockListSpaces.mockResolvedValue([
      {
        __typename: 'Space',
        id: 'space-shared',
        orgId: 'org-host',
        key: 'shared-space',
        name: 'Shared Space',
        storageUsageBytes: 256,
        processingUsageCount: 3,
        storageMode: 'platform',
        storageType: 'managed',
        bucket: '',
        prefix: '',
        region: '',
        endpoint: '',
        usePathStyle: false,
        customDomain: '',
        customDomainVerified: false,
        suspended: false,
        isShared: false,
        signerAlgorithm: 'sha256',
        signerTruncate: 32,
        imagorCORSOrigins: '',
        canManage: false,
        canDelete: false,
        canLeave: true,
        updatedAt: '2026-04-18T00:00:00Z',
      },
    ])
    mockGetMyOrganization.mockResolvedValue(null)
    mockGetUsageSummary.mockResolvedValue({
      __typename: 'UsageSummary',
      usedSpaces: 0,
      maxSpaces: null,
      usedHostedStorageBytes: 0,
      storageLimitGB: null,
      usedTransforms: 0,
      transformsLimit: null,
      periodStart: null,
      periodEnd: null,
    })

    const result = await spacesLoader()

    expect(result.currentOrganizationId).toBeNull()
    expect(result.currentOrganizationRole).toBeNull()
    expect(result.spaces).toHaveLength(1)
    expect(result.spaces[0]?.key).toBe('shared-space')
  })

  it('allows loading settings for a space owned by the current organization', async () => {
    const { resolveSpaceSettingsRouteContext } = await import('@/loaders/account-loader')

    mockGetSpace.mockResolvedValue({
      __typename: 'Space',
      id: 'space-acme',
      orgId: 'org-1',
      key: 'acme',
      name: 'Acme',
      storageUsageBytes: 1024,
      storageMode: 'platform',
      storageType: 'managed',
      bucket: '',
      prefix: '',
      region: '',
      endpoint: '',
      usePathStyle: false,
      customDomain: '',
      customDomainVerified: false,
      suspended: false,
      isShared: false,
      signerAlgorithm: 'sha256',
      signerTruncate: 32,
      imagorCORSOrigins: '',
      canManage: true,
      canDelete: true,
      canLeave: false,
      updatedAt: '2026-04-18T00:00:00Z',
    })
    mockGetMyOrganization.mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'owner',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })

    const result = await resolveSpaceSettingsRouteContext({ params: { routeSpaceKey: 'acme' } })

    expect(result.space.key).toBe('acme')
    expect(result.breadcrumb.label).toBe('Acme')
  })

  it('allows shared managers into space settings', async () => {
    const { resolveSpaceSettingsRouteContext } = await import('@/loaders/account-loader')

    mockGetSpace.mockResolvedValue({
      __typename: 'Space',
      id: 'space-shared-manage',
      orgId: 'org-host',
      key: 'shared',
      name: 'Shared Space',
      storageUsageBytes: 2048,
      storageMode: 'platform',
      storageType: 'managed',
      bucket: '',
      prefix: '',
      region: '',
      endpoint: '',
      usePathStyle: false,
      customDomain: '',
      customDomainVerified: false,
      suspended: false,
      isShared: false,
      signerAlgorithm: 'sha256',
      signerTruncate: 32,
      imagorCORSOrigins: '',
      canManage: true,
      canDelete: false,
      canLeave: true,
      updatedAt: '2026-04-18T00:00:00Z',
    })

    const result = await resolveSpaceSettingsRouteContext({ params: { routeSpaceKey: 'shared' } })

    expect(result.space.key).toBe('shared')
  })

  it('redirects shared members away from settings when they cannot manage', async () => {
    const { resolveSpaceSettingsRouteContext } = await import('@/loaders/account-loader')

    mockGetSpace.mockResolvedValue({
      __typename: 'Space',
      id: 'space-shared-readonly',
      orgId: 'org-host',
      key: 'shared',
      name: 'Shared Space',
      storageUsageBytes: 2048,
      storageMode: 'platform',
      storageType: 'managed',
      bucket: '',
      prefix: '',
      region: '',
      endpoint: '',
      usePathStyle: false,
      customDomain: '',
      customDomainVerified: false,
      suspended: false,
      isShared: false,
      signerAlgorithm: 'sha256',
      signerTruncate: 32,
      imagorCORSOrigins: '',
      canManage: false,
      canDelete: false,
      canLeave: true,
      updatedAt: '2026-04-18T00:00:00Z',
    })

    try {
      await resolveSpaceSettingsRouteContext({ params: { routeSpaceKey: 'shared' } })
      throw new Error('expected loader to redirect')
    } catch (error) {
      expect(error).toBeInstanceOf(Response)
      expect(error).toMatchObject({
        options: {
          to: '/spaces/$spaceKey',
          params: { spaceKey: 'shared' },
          statusCode: 307,
        },
      })
    }
  })

  it('does not request pending invitations for non-admin members', async () => {
    const { orgMembersLoader } = await import('@/loaders/account-loader')

    mockGetMyOrganization.mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-9',
      currentUserRole: 'member',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })
    mockListOrgMembers.mockResolvedValue([])

    const result = await orgMembersLoader()

    expect(mockListOrgInvitations).not.toHaveBeenCalled()
    expect(result.invitations).toEqual([])
  })

  it('reuses the provided organization in billing loader', async () => {
    const { billingLoader } = await import('@/loaders/account-loader')

    mockGetUsageSummary.mockResolvedValue({
      __typename: 'UsageSummary',
      usedSpaces: 1,
      maxSpaces: 3,
      usedHostedStorageBytes: 1024,
      storageLimitGB: 5,
      usedTransforms: 10,
      transformsLimit: 1000,
      periodStart: '2026-04-01T00:00:00Z',
      periodEnd: '2026-05-01T00:00:00Z',
    })

    const organization: NonNullable<MyOrganizationQuery['myOrganization']> = {
      __typename: 'Organization' as const,
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'owner',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    }

    const result = await billingLoader({ organization })

    expect(mockGetMyOrganization).not.toHaveBeenCalled()
    expect(result.organization).toEqual(organization)
  })

  it('requests pending invitations for organization admins', async () => {
    const { orgMembersLoader } = await import('@/loaders/account-loader')

    mockGetMyOrganization.mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'admin',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })
    mockListOrgMembers.mockResolvedValue([])
    mockListOrgInvitations.mockResolvedValue([
      {
        __typename: 'OrgInvitation',
        id: 'invite-1',
        email: 'pending@example.com',
        role: 'member',
        createdAt: '2026-04-18T00:00:00Z',
        expiresAt: '2026-04-25T00:00:00Z',
      },
    ])

    const result = await orgMembersLoader()

    expect(mockListOrgInvitations).toHaveBeenCalledTimes(1)
    expect(result.invitations).toHaveLength(1)
  })

  it('reuses the provided organization in org members loader', async () => {
    const { orgMembersLoader } = await import('@/loaders/account-loader')

    mockListOrgMembers.mockResolvedValue([])
    mockListOrgInvitations.mockResolvedValue([])

    const organization: NonNullable<MyOrganizationQuery['myOrganization']> = {
      __typename: 'Organization' as const,
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'admin',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    }

    const result = await orgMembersLoader({ organization })

    expect(mockGetMyOrganization).not.toHaveBeenCalled()
    expect(result.organization).toEqual(organization)
    expect(mockListOrgInvitations).toHaveBeenCalledTimes(1)
  })
})
