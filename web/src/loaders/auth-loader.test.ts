import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((options: unknown) => options)
const mockWaitFor = vi.fn()
const mockGetState = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  redirect: (options: unknown) => mockRedirect(options),
}))

vi.mock('@/api/org-api', () => ({
  getMyOrganization: vi.fn(),
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
})
