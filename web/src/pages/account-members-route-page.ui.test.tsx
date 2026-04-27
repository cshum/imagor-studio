import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCancelOrgInvitation = vi.fn()
const mockGetMyOrganization = vi.fn()
const mockInviteOrgMember = vi.fn()
const mockListOrgInvitations = vi.fn()
const mockListOrgMembers = vi.fn()
const mockRemoveOrgMember = vi.fn()
const mockTransferOrganizationOwnership = vi.fn()
const mockUpdateOrgMemberRole = vi.fn()
const mockRefreshAuthSession = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (values?.expiresAt) {
        return `${key}:${values.expiresAt}`
      }
      return key
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('lucide-react', () => {
  const Icon = () => <svg />
  return {
    Clock3: Icon,
    MoreHorizontal: Icon,
    UserMinus: Icon,
  }
})

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => ({
    authState: {
      profile: { id: 'user-1' },
    },
    refreshAuthSession: mockRefreshAuthSession,
  }),
}))

vi.mock('@/api/org-api', async () => {
  const actual = await vi.importActual<typeof import('@/api/org-api')>('@/api/org-api')
  return {
    ...actual,
    cancelOrgInvitation: mockCancelOrgInvitation,
    getMyOrganization: mockGetMyOrganization,
    inviteOrgMember: mockInviteOrgMember,
    listOrgInvitations: mockListOrgInvitations,
    listOrgMembers: mockListOrgMembers,
    removeOrgMember: mockRemoveOrgMember,
    transferOrganizationOwnership: mockTransferOrganizationOwnership,
    updateOrgMemberRole: mockUpdateOrgMemberRole,
  }
})

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
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

describe('AccountMembersRoutePage pending invitations', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useFakeTimers()
  })

  it('renders pending org invites and cancels one', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockCancelOrgInvitation.mockResolvedValue(true)

    render(
      <AccountMembersRoutePage
        loaderData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
          invitations: [
            {
              __typename: 'OrgInvitation',
              id: 'invite-1',
              email: 'pending@example.com',
              role: 'member',
              createdAt: '2026-04-18T00:00:00Z',
              expiresAt: '2026-04-25T00:00:00Z',
            },
          ],
          members: [
            {
              __typename: 'OrgMember',
              userId: 'user-1',
              username: 'alice',
              displayName: 'Alice',
              email: 'alice@example.com',
              avatarUrl: null,
              role: 'owner',
              createdAt: '2026-04-18T00:00:00Z',
            },
          ],
          organization: {
            __typename: 'Organization',
            id: 'org-1',
            name: 'Acme Org',
            slug: 'acme',
            ownerUserId: 'user-1',
            currentUserRole: 'owner',
            plan: 'trial',
            planStatus: 'active',
            createdAt: '2026-04-18T00:00:00Z',
            updatedAt: '2026-04-18T00:00:00Z',
          },
        }}
      />,
    )

    expect(screen.getByText('pending@example.com')).toBeTruthy()
    fireEvent.click(screen.getByText('pages.organizationMembers.cancelInvite'))

    await waitFor(() => {
      expect(mockCancelOrgInvitation).toHaveBeenCalledWith({ invitationId: 'invite-1' })
    })
    await waitFor(() => {
      expect(screen.queryByText('pending@example.com')).toBeNull()
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('pages.organizationMembers.messages.inviteCanceled')
  })
})