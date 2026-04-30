import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
const mockGetAuthProviders = vi.fn()
const mockUseAuth = vi.fn()
const mockUseSearch = vi.fn()

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
  login: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  initAuth: vi.fn(),
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/stores/locale-store', () => ({
  initializeLocale: vi.fn(),
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthProviders.mockResolvedValue({ providers: ['google'] })
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

  it('preserves invite_token on the create-account link', async () => {
    const { LoginPage } = await import('./login-page')

    render(<LoginPage />)

    expect(
      screen.getByRole('link', { name: 'auth.login.createAccountLink' }).getAttribute('href'),
    ).toBe('/register?invite_token=invite-token-123')
  })
})
