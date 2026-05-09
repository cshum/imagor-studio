import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearPreviewSession, getPreviewSession } from './preview-session'

const { getAuthMock } = vi.hoisted(() => ({
	getAuthMock: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
	getAuth: getAuthMock,
}))

vi.mock('@/lib/api-utils', () => ({
	getBaseUrl: () => 'http://localhost:8080',
}))

describe('preview-session', () => {
	beforeEach(() => {
		clearPreviewSession()
		getAuthMock.mockReturnValue({ accessToken: null })
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('calls preview-session without auth header when access token is absent', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({
				token: 'preview-token',
				expiresAt: '2030-01-01T00:00:00Z',
				processingOrigin: 'https://demo-space.imagor.app',
			}),
		} as Response)

		await getPreviewSession('space-demo')

		expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/auth/preview-session', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ spaceID: 'space-demo' }),
			signal: undefined,
		})
	})

	it('includes auth header when access token is present', async () => {
		getAuthMock.mockReturnValue({ accessToken: 'user-token' })
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => ({
				token: 'preview-token',
				expiresAt: '2030-01-01T00:00:00Z',
				processingOrigin: 'https://demo-space.imagor.app',
			}),
		} as Response)

		await getPreviewSession('space-demo')

		expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/auth/preview-session', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer user-token',
			},
			body: JSON.stringify({ spaceID: 'space-demo' }),
			signal: undefined,
		})
	})
})