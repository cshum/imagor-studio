import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRefreshToken = vi.fn()
const mockCheckFirstRun = vi.fn()
const mockEmbeddedGuestLogin = vi.fn()
const mockGuestLogin = vi.fn()
const mockGetCurrentUser = vi.fn()

vi.mock('@/api/auth-api', () => ({
  checkFirstRun: mockCheckFirstRun,
  embeddedGuestLogin: mockEmbeddedGuestLogin,
  guestLogin: mockGuestLogin,
  refreshToken: mockRefreshToken,
}))

vi.mock('@/api/user-api', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

describe('auth-store refreshAuthSession', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    window.localStorage.clear()
  })

  it('refreshes the current authenticated session and updates the stored token', async () => {
    const authStoreModule = await import('./auth-store')

    authStoreModule.authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: 'old-token',
        profile: {
          id: 'user-1',
          displayName: 'Alice',
          username: 'alice',
          role: 'user',
        } as never,
      },
    })

    mockRefreshToken.mockResolvedValue({
      token: 'new-token',
      expiresIn: 3600,
      user: {
        id: 'user-1',
        displayName: 'Alice',
        username: 'alice',
        role: 'user',
      },
    })
    mockGetCurrentUser.mockResolvedValue({
      id: 'user-1',
      displayName: 'Alice Updated',
      username: 'alice',
      role: 'user',
    })

    const result = await authStoreModule.refreshAuthSession()

    expect(mockRefreshToken).toHaveBeenCalledWith('old-token')
    expect(mockGetCurrentUser).toHaveBeenCalledWith('new-token')
    expect(result.accessToken).toBe('new-token')
    expect(result.profile?.displayName).toBe('Alice Updated')
    expect(window.localStorage.getItem('auth_token')).toBe('new-token')
  })

  it('logs out and clears the stored token when refresh fails', async () => {
    const authStoreModule = await import('./auth-store')

    authStoreModule.authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: 'stale-token',
        profile: {
          id: 'user-1',
          displayName: 'Alice',
          username: 'alice',
          role: 'user',
        } as never,
      },
    })

    mockRefreshToken.mockRejectedValue(new Error('refresh failed'))

    const result = await authStoreModule.refreshAuthSession()

    expect(mockRefreshToken).toHaveBeenCalledWith('stale-token')
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
    expect(result.state).toBe('unauthenticated')
    expect(result.accessToken).toBeNull()
    expect(result.profile).toBeNull()
    expect(window.localStorage.getItem('auth_token')).toBeNull()
  })

  it('skips refresh for embedded sessions', async () => {
    const authStoreModule = await import('./auth-store')

    authStoreModule.authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: 'embedded-token',
        profile: {
          id: 'guest-1',
          displayName: 'Embedded Guest',
          username: 'embedded-guest',
          role: 'guest',
        } as never,
        isEmbedded: true,
      },
    })

    const result = await authStoreModule.refreshAuthSession()

    expect(mockRefreshToken).not.toHaveBeenCalled()
    expect(result.accessToken).toBe('embedded-token')
  })

  it('skips guest bootstrap on multi-tenant login routes without a token', async () => {
    vi.stubEnv('VITE_MULTI_TENANT', 'true')

    const authStoreModule = await import('./auth-store')

    mockCheckFirstRun.mockResolvedValue({
      isFirstRun: false,
      multiTenant: true,
      timestamp: Date.now(),
    })

    const result = await authStoreModule.initAuth(undefined, '/login')

    expect(mockCheckFirstRun).toHaveBeenCalledTimes(1)
    expect(mockGuestLogin).not.toHaveBeenCalled()
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
    expect(result.state).toBe('unauthenticated')
  })

  it('still probes guest auth on multi-tenant space routes without a token', async () => {
    vi.stubEnv('VITE_MULTI_TENANT', 'true')

    const authStoreModule = await import('./auth-store')

    mockCheckFirstRun.mockResolvedValue({
      isFirstRun: false,
      multiTenant: true,
      timestamp: Date.now(),
    })
    mockGuestLogin.mockResolvedValue({
      token: 'guest-token',
      expiresIn: 3600,
      user: {
        id: 'guest-1',
        displayName: 'Guest',
        username: 'guest',
        role: 'guest',
      },
    })
    mockGetCurrentUser.mockResolvedValue({
      id: 'guest-1',
      displayName: 'Guest',
      username: 'guest',
      role: 'guest',
    })

    const result = await authStoreModule.initAuth(undefined, '/spaces/acme-space')

    expect(mockGuestLogin).toHaveBeenCalledWith('acme-space')
    expect(mockGetCurrentUser).toHaveBeenCalledWith('guest-token')
    expect(result.state).toBe('guest')
  })
})
