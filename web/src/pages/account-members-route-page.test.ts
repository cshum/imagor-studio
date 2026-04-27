import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetMyOrganization = vi.fn()
const mockListOrgMembers = vi.fn()

vi.mock('@/api/org-api', async () => {
  const actual = await vi.importActual<typeof import('@/api/org-api')>('@/api/org-api')
  return {
    ...actual,
    getMyOrganization: mockGetMyOrganization,
    listOrgMembers: mockListOrgMembers,
  }
})

describe('reloadOrganizationMembersData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes the auth session when the current user role changes', async () => {
    const refreshAuthSession = vi.fn().mockResolvedValue(undefined)
    const { reloadOrganizationMembersData } = await import('./account-members-route-page')

    mockGetMyOrganization.mockResolvedValue({
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-2',
      currentUserRole: 'admin',
      plan: 'trial',
      planStatus: 'active',
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    })
    mockListOrgMembers.mockResolvedValue([
      {
        __typename: 'OrgMember',
        userId: 'user-1',
        username: 'alice',
        displayName: 'Alice',
        email: 'alice@example.com',
        avatarUrl: null,
        role: 'admin',
        joinedAt: '2026-04-18T00:00:00Z',
      },
    ])

    const result = await reloadOrganizationMembersData({
      currentRole: 'owner',
      refreshAuthSession,
    })

    expect(refreshAuthSession).toHaveBeenCalledTimes(1)
    expect(result.nextOrganization?.currentUserRole).toBe('admin')
    expect(result.nextMembers).toHaveLength(1)
  })

  it('does not refresh the auth session when the current user role is unchanged', async () => {
    const refreshAuthSession = vi.fn().mockResolvedValue(undefined)
    const { reloadOrganizationMembersData } = await import('./account-members-route-page')

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
    mockListOrgMembers.mockResolvedValue([])

    await reloadOrganizationMembersData({
      currentRole: 'owner',
      refreshAuthSession,
    })

    expect(refreshAuthSession).not.toHaveBeenCalled()
  })
})
