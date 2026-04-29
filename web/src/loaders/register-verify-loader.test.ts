import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((options: { to: string }) => ({ ...options, __redirect: true }))
const mockVerifyPublicSignup = vi.fn()
const mockInitAuth = vi.fn()
const mockGetAuth = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  redirect: mockRedirect,
}))

vi.mock('@/api/auth-api', () => ({
  verifyPublicSignup: mockVerifyPublicSignup,
}))

vi.mock('@/stores/auth-store', () => ({
  initAuth: mockInitAuth,
  getAuth: mockGetAuth,
}))

describe('registerVerifyLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/register/verify')
    mockGetAuth.mockReturnValue({ state: 'unauthenticated', accessToken: null })
  })

  it('returns an error payload when the token is missing', async () => {
    const { registerVerifyLoader } = await import('./register-verify-loader')

    await expect(registerVerifyLoader()).resolves.toEqual({
      errorMessage: 'The confirmation link is missing its verification token.',
      verificationEmail: null,
      canResend: false,
    })
  })

  it('redirects home after successful verification', async () => {
    const { registerVerifyLoader } = await import('./register-verify-loader')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=valid-token&email=owner%40example.com',
    )
    mockVerifyPublicSignup.mockResolvedValue({ token: 'jwt-token' })
    mockInitAuth.mockResolvedValue({ state: 'authenticated', accessToken: 'jwt-token' })

    await expect(registerVerifyLoader()).rejects.toMatchObject({ to: '/' })

    expect(mockVerifyPublicSignup).toHaveBeenCalledWith('valid-token')
    expect(mockInitAuth).toHaveBeenCalledWith('jwt-token')
  })

  it('redirects to the invite target after successful verification when a redirect path is provided', async () => {
    const { registerVerifyLoader } = await import('./register-verify-loader')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=valid-token&email=owner%40example.com',
    )
    mockVerifyPublicSignup.mockResolvedValue({
      token: 'jwt-token',
      redirectPath: '/spaces/acme-space',
    })
    mockInitAuth.mockResolvedValue({ state: 'authenticated', accessToken: 'jwt-token' })

    await expect(registerVerifyLoader()).rejects.toMatchObject({ to: '/spaces/acme-space' })
  })

  it('redirects home when the token is already consumed but the session is already authenticated', async () => {
    const { registerVerifyLoader } = await import('./register-verify-loader')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=used-token&email=owner%40example.com',
    )
    mockVerifyPublicSignup.mockRejectedValue(
      Object.assign(new Error('Email already exists'), { status: 409 }),
    )
    mockInitAuth.mockResolvedValue({ state: 'authenticated', accessToken: 'stored-token' })

    await expect(registerVerifyLoader()).rejects.toMatchObject({ to: '/' })

    expect(mockInitAuth).toHaveBeenCalledWith()
  })

  it('returns error data when verification fails without an authenticated session', async () => {
    const { registerVerifyLoader } = await import('./register-verify-loader')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=expired-token&email=owner%40example.com',
    )
    mockVerifyPublicSignup.mockRejectedValue(new Error('Verification link expired'))
    mockInitAuth.mockResolvedValue({ state: 'unauthenticated', accessToken: null })

    await expect(registerVerifyLoader()).resolves.toEqual({
      errorMessage: 'Verification link expired',
      verificationEmail: 'owner@example.com',
      canResend: true,
    })
  })

  it('does not offer resend when the email already exists but there is no authenticated session', async () => {
    const { registerVerifyLoader } = await import('./register-verify-loader')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=used-token&email=owner%40example.com',
    )
    mockVerifyPublicSignup.mockRejectedValue(
      Object.assign(new Error('Email already exists'), { status: 409 }),
    )
    mockInitAuth.mockResolvedValue({ state: 'unauthenticated', accessToken: null })

    await expect(registerVerifyLoader()).resolves.toEqual({
      errorMessage: 'Email already exists',
      verificationEmail: 'owner@example.com',
      canResend: false,
    })
  })
})
