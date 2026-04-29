import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((options: { to: string }) => ({ ...options, __redirect: true }))
const mockGetAuth = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  redirect: mockRedirect,
}))

vi.mock('@/stores/auth-store', () => ({
  getAuth: mockGetAuth,
}))

describe('authCallbackLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/auth/callback')
  })

  it('redirects to the invite target when redirect_path is present on a successful callback', async () => {
    const { authCallbackLoader } = await import('./auth-callback-loader')
    mockGetAuth.mockReturnValue({ state: 'authenticated' })
    window.history.replaceState(
      {},
      '',
      '/auth/callback?token=jwt-token&redirect_path=%2Fspaces%2Facme-space',
    )

    try {
      authCallbackLoader()
      throw new Error('expected redirect')
    } catch (error) {
      expect(error).toMatchObject({ to: '/spaces/acme-space' })
    }
  })

  it('falls back to home when redirect_path is missing or unsafe', async () => {
    const { authCallbackLoader } = await import('./auth-callback-loader')
    mockGetAuth.mockReturnValue({ state: 'authenticated' })
    window.history.replaceState(
      {},
      '',
      '/auth/callback?token=jwt-token&redirect_path=%2F%2Fevil.example',
    )

    try {
      authCallbackLoader()
      throw new Error('expected redirect')
    } catch (error) {
      expect(error).toMatchObject({ to: '/' })
    }
  })
})
