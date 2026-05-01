import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockGetAuthProviders = vi.fn()
const mockLogin = vi.fn()
const mockUseAuth = vi.fn()
const mockUseSearch = vi.fn()
const mockAuthPageShell = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const href = search?.invite_token ? `${to}?invite_token=${search.invite_token}` : to
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  Navigate: ({ to }: { to: string }) => <div>{`Navigate:${to}`}</div>,
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: vi.fn() }),
  useSearch: () => mockUseSearch(),
}))

vi.mock('@/api/auth-api', () => ({
  getAuthProviders: mockGetAuthProviders,
  getGoogleLoginUrl: (inviteToken?: string) =>
    inviteToken ? `/api/auth/google/login?invite_token=${inviteToken}` : '/api/auth/google/login',
  login: (...args: unknown[]) => mockLogin(...args),
}))

vi.mock('@/stores/auth-store', () => ({
  initAuth: vi.fn(),
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/stores/locale-store', () => ({
  initializeLocale: vi.fn(),
}))

vi.mock('@/components/auth-page-shell', () => ({
  AuthPageShell: (props: any) => {
    mockAuthPageShell(props)
    return (
      <div>
        <h1>{props.formTitle}</h1>
        {props.children}
      </div>
    )
  },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{isLoading ? 'loading' : children}</button>
  ),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    delete (window as Window & { __IMAGOR_STUDIO_BOOTSTRAP__?: unknown })
      .__IMAGOR_STUDIO_BOOTSTRAP__
    mockGetAuthProviders.mockResolvedValue({ providers: ['google'] })
    mockLogin.mockResolvedValue({ token: 'token-123', redirectPath: '/' })
    mockUseSearch.mockReturnValue({ invite_token: 'invite-token-123' })
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

  it('preserves invite_token on the create-account link', async () => {
    const { LoginPage } = await import('./login-page')

    await act(async () => {
      render(<LoginPage />)
    })

    expect(
      screen.getByRole('link', { name: 'auth.login.createAccountLink' }).getAttribute('href'),
    ).toBe('/register?invite_token=invite-token-123')
  })

  it('renders the self-hosted login in single-column mode', async () => {
    mockUseAuth.mockReturnValue({
      authState: {
        isEmbedded: false,
        isFirstRun: false,
        multiTenant: false,
        state: 'unauthenticated',
      },
    })

    const { LoginPage } = await import('./login-page')

    await act(async () => {
      render(<LoginPage />)
    })

    expect(mockAuthPageShell).toHaveBeenCalled()
    const lastShellCall = mockAuthPageShell.mock.calls[mockAuthPageShell.mock.calls.length - 1]
    expect(lastShellCall?.[0].showHero).toBe(false)
    expect(screen.queryByRole('link', { name: 'auth.login.createAccountLink' })).toBeNull()
  })

  it('maps invite email mismatch into a user-facing login error', async () => {
    const { LoginPage } = await import('./login-page')
    mockLogin.mockRejectedValueOnce(
      Object.assign(new Error('raw backend message'), { reason: 'invite_email_mismatch' }),
    )

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('auth.login.identifierLabelCloud'), {
      target: { value: 'invitee@example.com' },
    })
    fireEvent.change(screen.getByLabelText('common.labels.password'), {
      target: { value: 'password123' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'auth.login.signIn' }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('auth.login.errors.inviteEmailMismatch')).toBeTruthy()
    })
  })

  it('uses bootstrapped auth providers without fetching them again', async () => {
    ;(window as Window & { __IMAGOR_STUDIO_BOOTSTRAP__?: unknown }).__IMAGOR_STUDIO_BOOTSTRAP__ = {
      authProviders: ['google'],
    }

    const { LoginPage } = await import('./login-page')

    await act(async () => {
      render(<LoginPage />)
    })

    expect(screen.getByRole('button', { name: 'auth.login.googleCta' })).toBeTruthy()
    expect(mockGetAuthProviders).not.toHaveBeenCalled()
  })
})
