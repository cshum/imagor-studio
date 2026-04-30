import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockErrorPage = vi.fn(({ title, description, actionLabel, actionHref, error }: any) => (
  <div>
    <div>{title}</div>
    <div>{description}</div>
    <div>{actionLabel}</div>
    <div>{actionHref}</div>
    <div>{error}</div>
  </div>
))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (key === 'pages.authCallback.errorOAuth' && values?.error) {
        return `pages.authCallback.errorOAuth:${values.error}`
      }
      return key
    },
  }),
}))

vi.mock('@/components/ui/error-page', () => ({
  ErrorPage: (props: any) => mockErrorPage(props),
}))

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/auth/callback')
  })

  it('maps invite email mismatch into the shared error page with a login action', async () => {
    const { AuthCallbackPage } = await import('./auth-callback-page')
    window.history.replaceState(
      {},
      '',
      '/auth/callback?error=invite_email_mismatch&invite_token=invite-token-123',
    )

    render(<AuthCallbackPage />)

    expect(screen.getByText('pages.authCallback.title')).toBeTruthy()
    expect(screen.getByText('pages.authCallback.subtitle')).toBeTruthy()
    expect(screen.getByText('pages.authCallback.backToLogin')).toBeTruthy()
    expect(screen.getByText('/login?invite_token=invite-token-123')).toBeTruthy()
    expect(screen.getByText('pages.authCallback.errors.inviteEmailMismatch')).toBeTruthy()
    expect(mockErrorPage).toHaveBeenCalledWith(
      expect.objectContaining({
        actionHref: '/login?invite_token=invite-token-123',
        actionLabel: 'pages.authCallback.backToLogin',
        error: 'pages.authCallback.errors.inviteEmailMismatch',
        title: 'pages.authCallback.title',
      }),
    )
  })

  it('maps invalid invites into the shared error page with preserved invite context', async () => {
    const { AuthCallbackPage } = await import('./auth-callback-page')
    window.history.replaceState(
      {},
      '',
      '/auth/callback?error=invite_invalid&invite_token=invite-token-123',
    )

    render(<AuthCallbackPage />)

    expect(screen.getByText('/login?invite_token=invite-token-123')).toBeTruthy()
    expect(screen.getByText('pages.authCallback.errors.inviteInvalid')).toBeTruthy()
  })

  it('falls back to a formatted OAuth error message for unknown errors', async () => {
    const { AuthCallbackPage } = await import('./auth-callback-page')
    window.history.replaceState({}, '', '/auth/callback?error=provider_timeout')

    render(<AuthCallbackPage />)

    expect(screen.getByText('pages.authCallback.errorOAuth:provider timeout')).toBeTruthy()
  })

  it('maps OAuth state errors into a user-facing callback message', async () => {
    const { AuthCallbackPage } = await import('./auth-callback-page')
    window.history.replaceState({}, '', '/auth/callback?error=oauth_invalid_state')

    render(<AuthCallbackPage />)

    expect(screen.getByText('pages.authCallback.errors.oauthInvalidState')).toBeTruthy()
  })
})
