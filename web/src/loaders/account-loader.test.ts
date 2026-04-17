import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/api/imagor-api', () => ({
  getImagorStatus: vi.fn(),
}))

vi.mock('@/api/license-api', () => ({
  getLicenseStatus: vi.fn(),
}))

vi.mock('@/api/org-api', () => ({
  getMyOrganization: vi.fn(),
  getSpace: vi.fn(),
  listSpaces: vi.fn(),
}))

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

import { spaceSettingsLoader, spacesLoader } from '@/loaders/account-loader'
import { getMyOrganization, getSpace, listSpaces } from '@/api/org-api'

describe('account-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes current organization id in spaces loader data', async () => {
    vi.mocked(listSpaces).mockResolvedValue([
      {
        __typename: 'Space',
        orgId: 'org-1',
        key: 'acme',
        name: 'Acme',
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
        updatedAt: '2026-04-18T00:00:00Z',
      },
    ])
    vi.mocked(getMyOrganization).mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })

    const result = await spacesLoader()

    expect(result.currentOrganizationId).toBe('org-1')
    expect(result.spaces).toHaveLength(1)
  })

  it('allows loading settings for a space owned by the current organization', async () => {
    vi.mocked(getSpace).mockResolvedValue({
      __typename: 'Space',
      orgId: 'org-1',
      key: 'acme',
      name: 'Acme',
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
      updatedAt: '2026-04-18T00:00:00Z',
    })
    vi.mocked(getMyOrganization).mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })

    const result = await spaceSettingsLoader({ params: { spaceKey: 'acme' } })

    expect(result.space.key).toBe('acme')
    expect(result.breadcrumb.label).toBe('Acme')
  })

  it('redirects guest users away from settings for spaces owned by another organization', async () => {
    vi.mocked(getSpace).mockResolvedValue({
      __typename: 'Space',
      orgId: 'org-host',
      key: 'shared',
      name: 'Shared Space',
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
      updatedAt: '2026-04-18T00:00:00Z',
    })
    vi.mocked(getMyOrganization).mockResolvedValue({
      __typename: 'Organization',
      id: 'org-guest',
      name: 'Guest Org',
      slug: 'guest-org',
      ownerUserId: 'user-2',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })

    try {
      await spaceSettingsLoader({ params: { spaceKey: 'shared' } })
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
})