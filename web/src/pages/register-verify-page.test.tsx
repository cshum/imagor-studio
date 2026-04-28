import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockVerifyPublicSignup = vi.fn()
const mockResendPublicSignupVerification = vi.fn()
const mockInitAuth = vi.fn()
const mockInitializeLocale = vi.fn()

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
  useNavigate: () => mockNavigate,
}))

vi.mock('@/api/auth-api', () => ({
  verifyPublicSignup: mockVerifyPublicSignup,
  resendPublicSignupVerification: mockResendPublicSignupVerification,
}))

vi.mock('@/stores/auth-store', () => ({
  initAuth: mockInitAuth,
}))

vi.mock('@/stores/locale-store', () => ({
  initializeLocale: mockInitializeLocale,
}))

vi.mock('@/components/brand-bar', () => ({
  BrandBar: () => <div>BrandBar</div>,
}))

vi.mock('@/components/license/license-badge.tsx', () => ({
  LicenseBadge: () => <div>LicenseBadge</div>,
}))

vi.mock('@/components/mode-toggle', () => ({
  ModeToggle: () => <div>ModeToggle</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <div>{children}</div>
    }
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{isLoading ? 'loading' : children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('RegisterVerifyPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/register/verify')
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
    vi.useFakeTimers()
  })

  it('shows a missing-token error without resend controls', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')

    render(<RegisterVerifyPage />)

    expect(screen.getByText('pages.registerVerify.errorTitle')).toBeTruthy()
    expect(screen.getByText('pages.registerVerify.missingToken')).toBeTruthy()
    expect(screen.queryByText(/pages\.registerVerify\.resendDescription/)).toBeNull()
    expect(mockVerifyPublicSignup).not.toHaveBeenCalled()
  })

  it('initializes auth and navigates on successful verification', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=valid-token&email=owner%40example.com',
    )

    mockVerifyPublicSignup.mockResolvedValue({ token: 'jwt-token' })

    render(<RegisterVerifyPage />)

    await waitFor(() => {
      expect(mockVerifyPublicSignup).toHaveBeenCalledWith('valid-token')
    })
    await waitFor(() => {
      expect(mockInitAuth).toHaveBeenCalledWith('jwt-token')
      expect(mockInitializeLocale).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('allows resend recovery after verification fails', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')
    window.history.replaceState(
      {},
      '',
      '/register/verify?token=expired-token&email=owner%40example.com',
    )

    mockVerifyPublicSignup.mockRejectedValue(new Error('Verification link expired'))
    mockResendPublicSignupVerification.mockResolvedValue({
      email: 'owner@example.com',
      verificationRequired: true,
      cooldownSeconds: 0,
      expiresInSeconds: 900,
      maskedDestination: 'o***@example.com',
    })

    render(<RegisterVerifyPage />)

    await waitFor(() => {
      expect(screen.getByText('Verification link expired')).toBeTruthy()
    })

    expect(
      screen.getByText('pages.registerVerify.resendDescription:owner@example.com'),
    ).toBeTruthy()

    fireEvent.click(screen.getByText('pages.registerVerify.resendAction'))

    await waitFor(() => {
      expect(mockResendPublicSignupVerification).toHaveBeenCalledWith('owner@example.com')
    })
    expect(screen.getByText('pages.registerVerify.resendSuccess')).toBeTruthy()
  })
})