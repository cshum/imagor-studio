import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockRegisterWithVerificationFallback = vi.fn()
const mockResendPublicSignupVerification = vi.fn()
const mockGetAuthProviders = vi.fn()
const mockInitAuth = vi.fn()
const mockInitializeLocale = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      if (values?.email) {
        return `${key}:${values.email}`
      }
      if (values?.seconds !== undefined) {
        return `${key}:${values.seconds}`
      }
      return key
    },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Navigate: ({ to }: { to: string }) => <div>{`Navigate:${to}`}</div>,
  useNavigate: () => mockNavigate,
}))

vi.mock('@/api/auth-api', () => ({
  getAuthProviders: mockGetAuthProviders,
  getGoogleLoginUrl: () => '/api/auth/google/login',
  registerWithVerificationFallback: mockRegisterWithVerificationFallback,
  resendPublicSignupVerification: mockResendPublicSignupVerification,
}))

vi.mock('@/stores/auth-store', () => ({
  initAuth: mockInitAuth,
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/stores/locale-store', () => ({
  initializeLocale: mockInitializeLocale,
}))

vi.mock('@/components/auth-page-shell', () => ({
  AuthPageShell: ({ children, formTitle }: any) => (
    <div>
      <h1>{formTitle}</h1>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{isLoading ? 'loading' : children}</button>
  ),
}))

describe('RegisterPage pending verification', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockGetAuthProviders.mockResolvedValue({ providers: [] })
    mockUseAuth.mockReturnValue({
      authState: {
        isEmbedded: false,
        isFirstRun: false,
        multiTenant: true,
        state: 'unauthenticated',
      },
    })
  })

  afterEach(() => {
    vi.useFakeTimers()
  })

  it('shows pending verification state after email signup and allows resend', async () => {
    const { RegisterPage } = await import('./register-page')

    mockRegisterWithVerificationFallback.mockResolvedValue({
      kind: 'verification-required',
      response: {
        email: 'owner@example.com',
        verificationRequired: true,
        cooldownSeconds: 0,
        expiresInSeconds: 900,
        maskedDestination: 'o***@example.com',
      },
    })
    mockResendPublicSignupVerification.mockResolvedValue({
      email: 'owner@example.com',
      verificationRequired: true,
      cooldownSeconds: 0,
      expiresInSeconds: 900,
      maskedDestination: 'o***@example.com',
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('pages.profile.displayName'), {
      target: { value: 'Acme Owner' },
    })
    fireEvent.change(screen.getByLabelText('pages.profile.email'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('common.labels.password'), {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText('pages.admin.confirmPassword'), {
      target: { value: 'Password123!' },
    })

    fireEvent.click(screen.getByText('auth.register.submit'))

    await waitFor(() => {
      expect(mockRegisterWithVerificationFallback).toHaveBeenCalledWith({
        displayName: 'Acme Owner',
        email: 'owner@example.com',
        password: 'Password123!',
      })
    })

    expect(screen.getByText('auth.register.pendingTitle')).toBeTruthy()
    expect(screen.getByText('auth.register.pendingDescription:o***@example.com')).toBeTruthy()

    fireEvent.click(screen.getByText('auth.register.resendAction'))

    await waitFor(() => {
      expect(mockResendPublicSignupVerification).toHaveBeenCalledWith('owner@example.com')
    })
    expect(screen.getByText('auth.register.resendSuccess')).toBeTruthy()
    expect(mockInitAuth).not.toHaveBeenCalled()
    expect(mockInitializeLocale).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows resend cooldown and keeps resend disabled until the countdown expires', async () => {
    const { RegisterPage } = await import('./register-page')

    mockRegisterWithVerificationFallback.mockResolvedValue({
      kind: 'verification-required',
      response: {
        email: 'owner@example.com',
        verificationRequired: true,
        cooldownSeconds: 3,
        expiresInSeconds: 900,
        maskedDestination: 'o***@example.com',
      },
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('pages.profile.displayName'), {
      target: { value: 'Acme Owner' },
    })
    fireEvent.change(screen.getByLabelText('pages.profile.email'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('common.labels.password'), {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText('pages.admin.confirmPassword'), {
      target: { value: 'Password123!' },
    })

    fireEvent.click(screen.getByText('auth.register.submit'))

    await waitFor(() => {
      expect(mockRegisterWithVerificationFallback).toHaveBeenCalledWith({
        displayName: 'Acme Owner',
        email: 'owner@example.com',
        password: 'Password123!',
      })
    })

    const resendButton = await screen.findByRole('button', {
      name: 'auth.register.resendCountdown:3',
    })

    expect((resendButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(resendButton)
    expect(mockResendPublicSignupVerification).not.toHaveBeenCalled()
  })

  it('shows the resend cooldown error state when resend returns 429', async () => {
    const { RegisterPage } = await import('./register-page')

    mockRegisterWithVerificationFallback.mockResolvedValue({
      kind: 'verification-required',
      response: {
        email: 'owner@example.com',
        verificationRequired: true,
        cooldownSeconds: 0,
        expiresInSeconds: 900,
        maskedDestination: 'o***@example.com',
      },
    })
    mockResendPublicSignupVerification.mockRejectedValue(
      Object.assign(new Error('Please wait before requesting another verification email'), {
        status: 429,
      }),
    )

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('pages.profile.displayName'), {
      target: { value: 'Acme Owner' },
    })
    fireEvent.change(screen.getByLabelText('pages.profile.email'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('common.labels.password'), {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText('pages.admin.confirmPassword'), {
      target: { value: 'Password123!' },
    })

    fireEvent.click(screen.getByText('auth.register.submit'))

    await waitFor(() => {
      expect(mockRegisterWithVerificationFallback).toHaveBeenCalledWith({
        displayName: 'Acme Owner',
        email: 'owner@example.com',
        password: 'Password123!',
      })
    })

    fireEvent.click(screen.getByText('auth.register.resendAction'))

    await waitFor(() => {
      expect(mockResendPublicSignupVerification).toHaveBeenCalledWith('owner@example.com')
    })
    expect(screen.getByText('auth.register.resendCooldown:0')).toBeTruthy()
  })
})
