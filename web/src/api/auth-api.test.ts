import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('auth api login', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('includes inviteToken in password login requests', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'token-123',
        expiresIn: 3600,
        user: {
          id: 'user-123',
          displayName: 'Test User',
          username: 'testuser',
          role: 'user',
        },
      }),
    })

    const { login } = await import('./auth-api')

    await login({
      username: 'testuser@example.com',
      password: 'Password123!',
      inviteToken: 'invite-token-123',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/login$/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser@example.com',
          password: 'Password123!',
          inviteToken: 'invite-token-123',
        }),
      }),
    )
  })

  it('sends authenticated invitation acceptance requests with bearer auth', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'token-456',
        expiresIn: 3600,
        user: {
          id: 'user-123',
          displayName: 'Test User',
          username: 'testuser',
          role: 'user',
        },
      }),
    })

    const { acceptInvitation } = await import('./auth-api')

    await acceptInvitation('invite-token-123', 'access-token-abc')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/invitations\/accept$/),
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-token-abc',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteToken: 'invite-token-123' }),
      }),
    )
  })

  it('preserves invite reason details on API errors', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: 'This invitation was sent to a different email address',
        code: 'INVALID_INPUT',
        details: {
          field: 'inviteToken',
          reason: 'invite_email_mismatch',
        },
      }),
    })

    const { acceptInvitation } = await import('./auth-api')

    await expect(acceptInvitation('invite-token-123', 'access-token-abc')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      field: 'inviteToken',
      reason: 'invite_email_mismatch',
    })
  })
})
