import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((options: unknown) => options)
const mockWaitFor = vi.fn()
const mockGetState = vi.fn()
const mockGetMyOrganization = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  redirect: (options: unknown) => mockRedirect(options),
}))

vi.mock('@/api/org-api', () => ({
  getMyOrganization: mockGetMyOrganization,
}))

vi.mock('@/stores/auth-store', () => ({
  authStore: {
    waitFor: (...args: unknown[]) => mockWaitFor(...args),
    getState: () => mockGetState(),
  },
}))

describe('auth-loader redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWaitFor.mockResolvedValue({
      state: 'unauthenticated',
      error: null,
      isEmbedded: false,
      isFirstRun: false,
    })
  })

  it('preserves pathname query state when redirecting unauthenticated users to login', async () => {
    const { requireAuth } = await import('./auth-loader')

    await expect(
      requireAuth({
        location: {
          pathname: '/editor/new',
          search: { template: 'social', page: 2, draft: true },
        },
      }),
    ).rejects.toEqual({
      to: '/login',
      search: { redirect: '/editor/new?template=social&page=2&draft=true' },
    })
  })

  it('does not add a redirect target for the root path', async () => {
    const { requireAuth } = await import('./auth-loader')

    await expect(
      requireAuth({
        location: {
          pathname: '/',
          search: {},
        },
      }),
    ).rejects.toEqual({ to: '/login' })
  })

  it('reuses a provided organization for multi-tenant org auth', async () => {
    mockWaitFor.mockResolvedValue({
      state: 'authenticated',
      error: null,
      isEmbedded: false,
      isFirstRun: false,
      multiTenant: true,
    })

    const { requireOrganizationAccountAuth } = await import('./auth-loader')

    await expect(
      requireOrganizationAccountAuth({
        organization: {
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
        },
      }),
    ).resolves.toMatchObject({ multiTenant: true })

    expect(mockGetMyOrganization).not.toHaveBeenCalled()
  })

  it('reuses a provided organization for multi-tenant org admin auth', async () => {
    mockWaitFor.mockResolvedValue({
      state: 'authenticated',
      error: null,
      isEmbedded: false,
      isFirstRun: false,
      multiTenant: true,
    })

    const { requireOrganizationAdminAccountAuth } = await import('./auth-loader')

    await expect(
      requireOrganizationAdminAccountAuth({
        organization: {
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
        },
      }),
    ).resolves.toMatchObject({ multiTenant: true })

    expect(mockGetMyOrganization).not.toHaveBeenCalled()
  })
})
