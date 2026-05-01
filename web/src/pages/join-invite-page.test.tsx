import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseLoaderData = vi.fn()
const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()
const mockUseAuth = vi.fn()
const mockAcceptInvitation = vi.fn()
const mockInitAuth = vi.fn()
const mockTranslate = vi.fn((key: string, values?: Record<string, string>) => {
  if (values?.organization) {
    return `${key}:${values.organization}`
  }
  if (values?.space) {
    return `${key}:${values.email}:${values.role}:${values.space}`
  }
  if (values?.email) {
    return `${key}:${values.email}:${values.role}`
  }
  return key
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslate,
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
  useLoaderData: () => mockUseLoaderData(),
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('@/api/auth-api', () => ({
  acceptInvitation: (...args: any[]) => mockAcceptInvitation(...args),
  getGoogleLoginUrl: (inviteToken?: string) =>
    inviteToken ? `/api/auth/google/login?invite_token=${inviteToken}` : '/api/auth/google/login',
}))

vi.mock('@/components/auth-page-shell', () => ({
  AuthPageShell: ({ children, eyebrow, heroBody, formTitle }: any) => (
    <div>
      <div>{eyebrow}</div>
      <h1>{formTitle}</h1>
      <div>{heroBody}</div>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <div>{children}</div>
    }
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('JoinInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLoaderData.mockReturnValue({
      invitation: {
        organizationName: 'Acme Org',
        invitedEmail: 'owner@example.com',
        role: 'member',
      },
      inviteToken: 'invite-token-123',
      errorMessage: null,
      errorReason: null,
    })
    mockUseAuth.mockReturnValue({
      authState: {
        accessToken: null,
        isEmbedded: false,
        multiTenant: true,
        state: 'unauthenticated',
      },
      initAuth: mockInitAuth,
    })
  })

  it('shows a reason-specific invalid invitation message for unauthenticated users', async () => {
    const { JoinInvitePage } = await import('./join-invite-page')
    mockUseLoaderData.mockReturnValue({
      invitation: null,
      inviteToken: 'invite-token-123',
      errorMessage: 'backend fallback message',
      errorReason: 'invite_email_mismatch',
    })

    render(<JoinInvitePage />)

    expect(screen.getByText('pages.joinInvite.formTitle')).toBeTruthy()
    expect(screen.getByText('pages.joinInvite.invalidTitle')).toBeTruthy()
    expect(screen.getByText('pages.joinInvite.errors.emailMismatch')).toBeTruthy()
    expect(screen.queryByText('backend fallback message')).toBeNull()
  })

  it('preserves the invite token on email signup and login actions', async () => {
    const { JoinInvitePage } = await import('./join-invite-page')

    render(<JoinInvitePage />)

    expect(
      screen.getByRole('link', { name: 'pages.joinInvite.emailAction' }).getAttribute('href'),
    ).toBe('/register?invite_token=invite-token-123')
    expect(
      screen.getByRole('link', { name: 'pages.joinInvite.loginInstead' }).getAttribute('href'),
    ).toBe('/login?invite_token=invite-token-123')
  })

  it('uses space-specific copy for space invites', async () => {
    const { JoinInvitePage } = await import('./join-invite-page')
    mockUseLoaderData.mockReturnValue({
      invitation: {
        organizationName: 'Acme Org',
        spaceName: 'Campaign Assets',
        invitedEmail: 'owner@example.com',
        role: 'viewer',
      },
      inviteToken: 'invite-token-123',
      errorMessage: null,
      errorReason: null,
    })

    render(<JoinInvitePage />)

    expect(screen.getByText('pages.joinInvite.spaceEyebrow')).toBeTruthy()
    expect(screen.getByText('pages.joinInvite.spaceHeroDescription')).toBeTruthy()
    expect(screen.getByText('pages.joinInvite.spaceSecondaryHelp')).toBeTruthy()
    expect(
      screen.getByText('pages.joinInvite.spaceDescription:owner@example.com:viewer:Campaign Assets'),
    ).toBeTruthy()
  })
})
