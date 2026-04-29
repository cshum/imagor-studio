import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseLoaderData = vi.fn()
const mockResendPublicSignupVerification = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      if (key === 'pages.registerVerify.errorSubtitle') {
        return 'The confirmation link may be invalid or expired.'
      }
      if (key === 'pages.registerVerify.signInInsteadDescription' && values?.email) {
        return `pages.registerVerify.signInInsteadDescription:${values.email}`
      }
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
  useLoaderData: () => mockUseLoaderData(),
}))

vi.mock('@/api/auth-api', () => ({
  resendPublicSignupVerification: mockResendPublicSignupVerification,
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

vi.mock('@/components/language-selector', () => ({
  LanguageSelector: () => <div>LanguageSelector</div>,
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

describe('RegisterVerifyPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockUseLoaderData.mockReturnValue({
      errorMessage: 'Verification link expired',
      verificationEmail: 'owner@example.com',
      canResend: true,
    })
  })

  afterEach(() => {
    vi.useFakeTimers()
  })

  it('shows a missing-token error without resend controls', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')
    mockUseLoaderData.mockReturnValue({
      errorMessage: 'pages.registerVerify.missingToken',
      verificationEmail: null,
      canResend: false,
    })

    render(<RegisterVerifyPage />)

    expect(screen.getByText('pages.registerVerify.errorTitle')).toBeTruthy()
    expect(screen.getByText('pages.registerVerify.missingToken')).toBeTruthy()
    expect(screen.queryByText(/pages\.registerVerify\.resendDescription/)).toBeNull()
  })

  it('allows resend recovery after verification fails', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')
    mockResendPublicSignupVerification.mockResolvedValue({
      email: 'owner@example.com',
      verificationRequired: true,
      cooldownSeconds: 0,
      expiresInSeconds: 900,
      maskedDestination: 'o***@example.com',
    })

    render(<RegisterVerifyPage />)

    expect(screen.queryByText('Verification link expired')).toBeNull()
    expect(
      screen.getByText('pages.registerVerify.resendDescription:owner@example.com'),
    ).toBeTruthy()

    fireEvent.click(screen.getByText('pages.registerVerify.resendAction'))

    await waitFor(() => {
      expect(mockResendPublicSignupVerification).toHaveBeenCalledWith('owner@example.com')
    })
    expect(screen.getByText('pages.registerVerify.resendSuccess')).toBeTruthy()
  })

  it('shows a non-redundant error detail when it adds new information', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')
    mockUseLoaderData.mockReturnValue({
      errorMessage: 'No pending sign-up found for this email',
      verificationEmail: 'owner@example.com',
      canResend: false,
    })

    render(<RegisterVerifyPage />)

    expect(
      screen.getByText('pages.registerVerify.signInInsteadDescription:owner@example.com'),
    ).toBeTruthy()
    expect(screen.queryByText('No pending sign-up found for this email')).toBeNull()
    expect(screen.queryByText('pages.registerVerify.resendAction')).toBeNull()
  })

  it('removes resend recovery when the backend reports no pending sign-up', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')
    mockResendPublicSignupVerification.mockRejectedValue(
      Object.assign(new Error('No pending sign-up found for this email'), { status: 400 }),
    )

    render(<RegisterVerifyPage />)

    fireEvent.click(screen.getByText('pages.registerVerify.resendAction'))

    await waitFor(() => {
      expect(
        screen.getByText('pages.registerVerify.signInInsteadDescription:owner@example.com'),
      ).toBeTruthy()
    })
    expect(screen.queryByText('pages.registerVerify.resendAction')).toBeNull()
    expect(screen.queryByText(/pages\.registerVerify\.resendDescription/)).toBeNull()
    expect(screen.queryByText('No pending sign-up found for this email')).toBeNull()
  })

  it('renders the full-page pending state without the old card layout', async () => {
    const { RegisterVerifyPendingPage } = await import('./register-verify-page')

    render(<RegisterVerifyPendingPage />)

    expect(screen.getByText('pages.registerVerify.title')).toBeTruthy()
    expect(screen.getByText('pages.registerVerify.subtitle')).toBeTruthy()
    expect(screen.getByText('pages.registerVerify.verifying')).toBeTruthy()
    expect(screen.queryByText('pages.registerVerify.errorTitle')).toBeNull()
  })

  it('shows back to login as the only secondary action', async () => {
    const { RegisterVerifyPage } = await import('./register-verify-page')

    render(<RegisterVerifyPage />)

    expect(screen.getByText('pages.registerVerify.backToLogin')).toBeTruthy()
    expect(screen.queryByText('common.navigation.home')).toBeNull()
  })
})
