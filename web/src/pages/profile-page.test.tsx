import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequestEmailChange = vi.fn()
const mockUpdateProfile = vi.fn()
const mockChangePassword = vi.fn()
const mockUnlinkAuthProvider = vi.fn()
const mockInitAuth = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

const mockUseAuth = vi.fn(() => ({
  authState: {
    multiTenant: true,
    profile: {
      displayName: 'Alice',
      username: 'alice',
      email: 'alice@example.com',
      pendingEmail: null,
      emailVerified: true,
      hasPassword: true,
      avatarUrl: null,
      authProviders: [],
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('@/api/user-api', () => ({
  requestEmailChange: (...args: unknown[]) => mockRequestEmailChange(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  unlinkAuthProvider: (...args: unknown[]) => mockUnlinkAuthProvider(...args),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => mockUseAuth(),
  initAuth: (...args: unknown[]) => mockInitAuth(...args),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogDescription: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogHeader: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/setting-row', () => ({
  SettingRow: ({ label, description, children }: any) => (
    <div>
      <div>{label}</div>
      <div>{description}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('@/components/ui/settings-section', () => ({
  SettingsSection: ({ title, description, children }: any) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
}))

const loaderData = (overrides?: Partial<any>) => ({
  breadcrumb: { translationKey: 'navigation.breadcrumbs.profile' },
  profile: {
    displayName: 'Alice',
    username: 'alice',
    email: 'alice@example.com',
    pendingEmail: null,
    emailVerified: true,
    hasPassword: true,
    avatarUrl: null,
    authProviders: [],
    ...overrides,
  },
})

describe('ProfilePage email change rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides in-app change email for provider-managed accounts', async () => {
    const { ProfilePage } = await import('./profile-page')

    render(
      <ProfilePage
        loaderData={loaderData({
          hasPassword: false,
          authProviders: [
            { provider: 'google', email: 'alice@example.com', linkedAt: '2026-04-30T00:00:00Z' },
          ],
        })}
      />,
    )

    expect(screen.queryByText('pages.profile.changeEmail')).toBeNull()
    expect(screen.getByText('pages.profile.emailChangeManaged')).toBeTruthy()
  })

  it('does not request an email change when the email is unchanged', async () => {
    const { ProfilePage } = await import('./profile-page')

    render(<ProfilePage loaderData={loaderData()} />)

    const emailInputs = screen.getAllByDisplayValue('alice@example.com')
    act(() => {
      fireEvent.change(emailInputs[emailInputs.length - 1], {
        target: { value: 'alice@example.com' },
      })
      fireEvent.click(screen.getByText('pages.profile.requestEmailChange'))
    })

    expect(mockRequestEmailChange).not.toHaveBeenCalled()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})
