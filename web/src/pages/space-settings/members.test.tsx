import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => ({
    authState: {
      profile: { id: 'user-1' },
    },
  }),
}))

vi.mock('@/api/org-api', async () => {
  const actual = await vi.importActual<typeof import('@/api/org-api')>('@/api/org-api')
  return {
    ...actual,
    inviteSpaceMember: vi.fn(),
    removeSpaceMember: vi.fn(),
    updateSpaceMemberRole: vi.fn(),
    leaveSpace: vi.fn(),
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
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

const createProps = () => ({
  spaceID: 'space-1',
  canLeave: true,
  initialInvitations: [] as Array<{
    __typename: 'SpaceInvitation'
    id: string
    email: string
    role: 'member' | 'admin'
    createdAt: string
    expiresAt: string
  }>,
  initialMembers: [
    {
      __typename: 'SpaceMember' as const,
      userId: 'user-1',
      username: 'alice',
      displayName: 'Alice',
      email: 'alice@example.com',
      avatarUrl: null,
      role: 'owner' as const,
      roleSource: 'organization' as const,
      canChangeRole: false,
      canRemove: false,
      createdAt: '2026-04-18T00:00:00Z',
    },
    {
      __typename: 'SpaceMember' as const,
      userId: 'user-2',
      username: 'bob',
      displayName: 'Bob',
      email: 'bob@example.com',
      avatarUrl: null,
      role: 'member' as const,
      roleSource: 'space' as const,
      canChangeRole: true,
      canRemove: true,
      createdAt: '2026-04-18T00:00:00Z',
    },
  ],
})

describe('MembersSection helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merges optimistic invitations without duplicating loader data entries', async () => {
    const { mergeSpaceInvitations } = await import('./members')

    const result = mergeSpaceInvitations(
      [
        {
          __typename: 'SpaceInvitation',
          id: 'invite-1',
          email: 'existing@example.com',
          role: 'member',
          createdAt: '2026-04-18T00:00:00Z',
          expiresAt: '2026-04-25T00:00:00Z',
        },
      ],
      [
        {
          __typename: 'SpaceInvitation',
          id: 'invite-1',
          email: 'existing@example.com',
          role: 'member',
          createdAt: '2026-04-18T00:00:00Z',
          expiresAt: '2026-04-25T00:00:00Z',
        },
        {
          __typename: 'SpaceInvitation',
          id: 'invite-2',
          email: 'new@example.com',
          role: 'member',
          createdAt: '2026-04-18T00:00:00Z',
          expiresAt: '2026-04-25T00:00:00Z',
        },
      ],
    )

    expect(result).toHaveLength(2)
    expect(result[1]?.email).toBe('new@example.com')
  })

  it('invalidates only for direct-add invite results', async () => {
    const { shouldInvalidateAfterSpaceInvite } = await import('./members')

    expect(
      shouldInvalidateAfterSpaceInvite({
        __typename: 'SpaceInviteResult',
        status: 'added',
        member: {
          __typename: 'SpaceMember',
          userId: 'user-3',
          username: 'charlie',
          displayName: 'Charlie',
          role: 'member',
          createdAt: '2026-04-18T00:00:00Z',
        },
        invitation: null,
      }),
    ).toBe(true)

    expect(
      shouldInvalidateAfterSpaceInvite({
        __typename: 'SpaceInviteResult',
        status: 'invited',
        member: null,
        invitation: {
          __typename: 'SpaceInvitation',
          id: 'invite-1',
          email: 'new@example.com',
          role: 'member',
          createdAt: '2026-04-18T00:00:00Z',
          expiresAt: '2026-04-25T00:00:00Z',
        },
      }),
    ).toBe(false)
  })
})

describe('MembersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rerenders directly from updated props without mirrored member state', async () => {
    const { MembersSection } = await import('./members')

    const props = createProps()
    const { rerender } = render(<MembersSection {...props} />)

    expect(screen.getByText('pages.spaceSettings.members.accessLabel (1)')).toBeTruthy()

    rerender(
      <MembersSection
        {...props}
        initialMembers={[
          ...props.initialMembers,
          {
            __typename: 'SpaceMember',
            userId: 'user-4',
            username: 'dana',
            displayName: 'Dana',
            email: 'dana@example.com',
            avatarUrl: null,
            role: 'member',
            roleSource: 'space',
            canChangeRole: true,
            canRemove: true,
            createdAt: '2026-04-18T00:00:00Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('pages.spaceSettings.members.accessLabel (2)')).toBeTruthy()
    expect(screen.getAllByText('Dana')).toHaveLength(2)
  })
})
