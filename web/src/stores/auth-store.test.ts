import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckFirstRun = vi.fn()
const mockGuestLogin = vi.fn()
const mockEmbeddedGuestLogin = vi.fn()
const mockGetCurrentUser = vi.fn()

vi.mock('@/api/auth-api', () => ({
	checkFirstRun: mockCheckFirstRun,
	guestLogin: mockGuestLogin,
	embeddedGuestLogin: mockEmbeddedGuestLogin,
}))

vi.mock('@/api/user-api.ts', () => ({
	getCurrentUser: mockGetCurrentUser,
}))

describe('auth-store characterization', () => {
	beforeEach(async () => {
		vi.resetModules()
		vi.clearAllMocks()
		window.localStorage.clear()
		window.history.replaceState({}, '', '/')
	})

	it('initializes authenticated state from explicit token and first-run response', async () => {
		mockGetCurrentUser.mockResolvedValue({ id: 'u1', username: 'alice', role: 'admin' })
		mockCheckFirstRun.mockResolvedValue({ isFirstRun: false, multiTenant: true })

		const { initAuth, getAuth } = await import('@/stores/auth-store')

		const auth = await initAuth('token-123')

		expect(mockGetCurrentUser).toHaveBeenCalledWith('token-123')
		expect(auth.state).toBe('authenticated')
		expect(auth.multiTenant).toBe(true)
		expect(auth.profile?.username).toBe('alice')
		expect(window.localStorage.getItem('auth_token')).toBe('token-123')
		expect(getAuth().state).toBe('authenticated')
	})

	it('falls back to guest login when not first run and no token exists', async () => {
		mockCheckFirstRun.mockResolvedValue({ isFirstRun: false, multiTenant: false })
		mockGuestLogin.mockResolvedValue({ token: 'guest-token' })
		mockGetCurrentUser.mockResolvedValue({ id: 'g1', username: 'guest', role: 'guest' })

		const { initAuth } = await import('@/stores/auth-store')

		const auth = await initAuth()

		expect(mockGuestLogin).toHaveBeenCalled()
		expect(auth.state).toBe('guest')
		expect(auth.multiTenant).toBe(false)
		expect(auth.profile?.role).toBe('guest')
		expect(window.localStorage.getItem('auth_token')).toBe('guest-token')
	})

	it('stays unauthenticated on first run without guest login', async () => {
		mockCheckFirstRun.mockResolvedValue({ isFirstRun: true, multiTenant: false })

		const { initAuth } = await import('@/stores/auth-store')

		const auth = await initAuth()

		expect(mockGuestLogin).not.toHaveBeenCalled()
		expect(auth.state).toBe('unauthenticated')
		expect(auth.isFirstRun).toBe(true)
	})

	it('clears invalid token and returns first-run logout state when token validation fails', async () => {
		window.localStorage.setItem('auth_token', 'stale-token')
		mockGetCurrentUser.mockRejectedValue(new Error('bad token'))
		mockCheckFirstRun.mockResolvedValue({ isFirstRun: true, multiTenant: true })

		const { initAuth } = await import('@/stores/auth-store')

		const auth = await initAuth()

		expect(auth.state).toBe('unauthenticated')
		expect(auth.isFirstRun).toBe(true)
		expect(auth.multiTenant).toBe(true)
		expect(window.localStorage.getItem('auth_token')).toBeNull()
	})

	it('supports embedded auth path with embedded guest token exchange', async () => {
		vi.stubEnv('VITE_EMBEDDED_MODE', 'true')
		window.history.replaceState({}, '', '/?token=embed-token')
		mockEmbeddedGuestLogin.mockResolvedValue({ token: 'session-token', pathPrefix: '/allowed' })
		mockGetCurrentUser.mockResolvedValue({ id: 'e1', username: 'embed', role: 'guest' })

		const { initAuth } = await import('@/stores/auth-store')

		const auth = await initAuth()

		expect(mockEmbeddedGuestLogin).toHaveBeenCalledWith('embed-token')
		expect(auth.isEmbedded).toBe(true)
		expect(auth.pathPrefix).toBe('/allowed')
		expect(auth.state).toBe('guest')
		expect(window.localStorage.getItem('auth_token')).toBeNull()

		vi.unstubAllEnvs()
	})

	it('clears persisted token on logout', async () => {
		mockGetCurrentUser.mockResolvedValue({ id: 'u1', username: 'alice', role: 'admin' })
		mockCheckFirstRun.mockResolvedValue({ isFirstRun: false, multiTenant: false })

		const { initAuth, logout } = await import('@/stores/auth-store')

		await initAuth('token-logout')
		expect(window.localStorage.getItem('auth_token')).toBe('token-logout')

		const auth = await logout()
		expect(auth.state).toBe('unauthenticated')
		expect(window.localStorage.getItem('auth_token')).toBeNull()
	})
})