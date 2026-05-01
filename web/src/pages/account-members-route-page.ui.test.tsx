import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCancelOrgInvitation = vi.fn()
const mockAddOrgMember = vi.fn()
const mockInviteOrgMember = vi.fn()
const mockRemoveOrgMember = vi.fn()
const mockTransferOrganizationOwnership = vi.fn()
const mockUpdateOrgMemberRole = vi.fn()
const mockRefreshAuthSession = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockInvalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

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
    addOrgMember: mockAddOrgMember,
    cancelOrgInvitation: mockCancelOrgInvitation,
    inviteOrgMember: mockInviteOrgMember,
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
  ResponsiveDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
    mockInvalidate.mockResolvedValue(undefined)
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
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'pages.organizationMembers.messages.inviteCanceled',
    )
  })

  it('treats an already-removed org invite as a successful cancel', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockCancelOrgInvitation.mockRejectedValue({
      response: {
        errors: [
          {
            message: 'organization invitation not found',
            extensions: { reason: 'org_invitation_not_found' },
          },
        ],
      },
    })

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

    fireEvent.click(screen.getByText('pages.organizationMembers.cancelInvite'))

    await waitFor(() => {
      expect(mockCancelOrgInvitation).toHaveBeenCalledWith({ invitationId: 'invite-1' })
    })
    await waitFor(() => {
      expect(screen.queryByText('pending@example.com')).toBeNull()
    })
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'pages.organizationMembers.messages.inviteCanceled',
    )
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('does not reload organization data after sending a new org invitation', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockInviteOrgMember.mockResolvedValue({
      __typename: 'OrgInviteResult',
      status: 'invited',
      invitation: {
        __typename: 'OrgInvitation',
        id: 'invite-2',
        email: 'new@example.com',
        role: 'member',
        createdAt: '2026-04-18T00:00:00Z',
        expiresAt: '2026-04-25T00:00:00Z',
      },
      member: null,
    })

    render(
      <AccountMembersRoutePage
        loaderData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
          invitations: [],
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

    fireEvent.change(
      screen.getByPlaceholderText('pages.organizationMembers.identifierPlaceholder'),
      {
        target: { value: 'new@example.com' },
      },
    )
    fireEvent.click(screen.getByText('pages.organizationMembers.addButton'))

    await waitFor(() => {
      expect(mockInviteOrgMember).toHaveBeenCalledWith({ email: 'new@example.com', role: 'member' })
    })
    expect(mockInvalidate).not.toHaveBeenCalled()
    expect(mockRefreshAuthSession).not.toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalledWith('pages.organizationMembers.messages.inviteSent')
    expect(screen.getByText('new@example.com')).toBeTruthy()
  })

  it('invalidates the active route tree after adding a member directly', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockAddOrgMember.mockResolvedValue(true)

    render(
      <AccountMembersRoutePage
        loaderData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
          invitations: [],
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

    fireEvent.change(
      screen.getByPlaceholderText('pages.organizationMembers.identifierPlaceholder'),
      { target: { value: 'bob' } },
    )
    fireEvent.click(screen.getByText('pages.organizationMembers.addButton'))

    await waitFor(() => {
      expect(mockAddOrgMember).toHaveBeenCalledWith({ username: 'bob', role: 'member' })
    })
    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalledTimes(1)
    })
  })

  it('rerenders directly from updated loader data', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')

    const initialLoaderData = {
      breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
      invitations: [],
      members: [
        {
          __typename: 'OrgMember' as const,
          userId: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          email: 'alice@example.com',
          avatarUrl: null,
          role: 'owner' as const,
          createdAt: '2026-04-18T00:00:00Z',
        },
      ],
      organization: {
        __typename: 'Organization' as const,
        id: 'org-1',
        name: 'Acme Org',
        slug: 'acme',
        ownerUserId: 'user-1',
        currentUserRole: 'owner' as const,
        plan: 'trial',
        planStatus: 'active',
        createdAt: '2026-04-18T00:00:00Z',
        updatedAt: '2026-04-18T00:00:00Z',
      },
    }

    const { rerender } = render(<AccountMembersRoutePage loaderData={initialLoaderData} />)

    expect(screen.getByText('pages.organizationMembers.listTitle (1)')).toBeTruthy()

    rerender(
      <AccountMembersRoutePage
        loaderData={{
          ...initialLoaderData,
          members: [
            ...initialLoaderData.members,
            {
              __typename: 'OrgMember' as const,
              userId: 'user-2',
              username: 'bob',
              displayName: 'Bob',
              email: 'bob@example.com',
              avatarUrl: null,
              role: 'member' as const,
              createdAt: '2026-04-18T00:00:00Z',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('pages.organizationMembers.listTitle (2)')).toBeTruthy()
    expect(screen.getAllByText('Bob')).toHaveLength(2)
  })

  it('refreshes the auth session after ownership transfer invalidates the route tree', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockTransferOrganizationOwnership.mockResolvedValue(true)

    render(
      <AccountMembersRoutePage
        loaderData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
          invitations: [],
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
            {
              __typename: 'OrgMember',
              userId: 'user-2',
              username: 'bob',
              displayName: 'Bob',
              email: 'bob@example.com',
              avatarUrl: null,
              role: 'admin',
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

    fireEvent.click(screen.getAllByText('pages.organizationMembers.transferOwnership')[0]!)

    await waitFor(() => {
      expect(screen.getAllByText('pages.organizationMembers.transferOwnership')).toHaveLength(3)
    })

    fireEvent.click(screen.getAllByText('pages.organizationMembers.transferOwnership')[2]!)

    await waitFor(() => {
      expect(mockTransferOrganizationOwnership).toHaveBeenCalledWith({ userId: 'user-2' })
    })
    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalledTimes(1)
      expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1)
    })
  })

  it('shows org conflict inline instead of toast when inviting by email', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockInviteOrgMember.mockRejectedValue({
      response: {
        errors: [
          {
            message: 'user belongs to another organization',
            extensions: { reason: 'org_member_other_organization' },
          },
        ],
      },
    })

    const { container } = render(
      <AccountMembersRoutePage
        loaderData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
          invitations: [],
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

    fireEvent.change(
      screen.getByPlaceholderText('pages.organizationMembers.identifierPlaceholder'),
      { target: { value: 'new@example.com' } },
    )
    fireEvent.click(screen.getByText('pages.organizationMembers.addButton'))

    await waitFor(() => {
      expect(mockInviteOrgMember).toHaveBeenCalledWith({ email: 'new@example.com', role: 'member' })
    })
    expect(mockToastError).not.toHaveBeenCalled()
    expect(
      screen.getByText('pages.organizationMembers.messages.errors.otherOrganization'),
    ).toBeTruthy()
    expect(container.querySelector('[aria-invalid="true"]')).toBeTruthy()
  })

  it('shows already-member inline instead of toast when adding by username', async () => {
    const { AccountMembersRoutePage } = await import('./account-members-route-page')
    mockAddOrgMember.mockRejectedValue({
      response: {
        errors: [
          {
            message: 'user already belongs to organization',
            extensions: { reason: 'org_member_already_member' },
          },
        ],
      },
    })

    const { container } = render(
      <AccountMembersRoutePage
        loaderData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.organizationMembers' },
          invitations: [],
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

    fireEvent.change(
      screen.getByPlaceholderText('pages.organizationMembers.identifierPlaceholder'),
      { target: { value: 'alice' } },
    )
    fireEvent.click(screen.getByText('pages.organizationMembers.addButton'))

    await waitFor(() => {
      expect(mockAddOrgMember).toHaveBeenCalledWith({ username: 'alice', role: 'member' })
    })
    expect(mockToastError).not.toHaveBeenCalled()
    expect(screen.getByText('pages.organizationMembers.messages.errors.alreadyMember')).toBeTruthy()
    expect(container.querySelector('[aria-invalid="true"]')).toBeTruthy()
  })
})
