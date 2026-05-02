import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInvalidate = vi.fn()
const mockCreateOrganization = vi.fn()
const mockRefreshAuthSession = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockButtonWithLoading = vi.fn(({ children, isLoading, ...props }: any) => (
  <button {...props}>{children}</button>
))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useRouter: () => ({ invalidate: mockInvalidate }),
  useRouterState: () => ({ isLoading: false }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('@/api/org-api', () => ({
  createOrganization: () => mockCreateOrganization(),
  leaveSpace: vi.fn(),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <div>{children}</div>,
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
  ButtonWithLoading: (props: any) => mockButtonWithLoading(props),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: () => null,
}))

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogDescription: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogFooter: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogHeader: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogTitle: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => ({
    authState: { profile: { id: 'user-1' } },
    refreshAuthSession: mockRefreshAuthSession,
  }),
}))

describe('SpacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers create-organization recovery in the empty no-org state', async () => {
    const { SpacesPage } = await import('./spaces-page')

    mockCreateOrganization.mockResolvedValue({ id: 'org-1' })
    mockRefreshAuthSession.mockResolvedValue(undefined)
    mockInvalidate.mockResolvedValue(undefined)

    render(
      <SpacesPage
        loaderData={[]}
        usageSummary={null}
        currentOrganizationId={null}
        canCreateSpace={false}
        canManageOrganization={false}
      />,
    )

    await act(async () => {
      await mockButtonWithLoading.mock.calls[0][0].onClick()
    })

    expect(mockCreateOrganization).toHaveBeenCalled()
    expect(mockRefreshAuthSession).toHaveBeenCalled()
    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalledWith('pages.workspaceRequired.actions.createSuccess')
  })

  it('offers create-organization recovery when shared spaces exist but no organization remains', async () => {
    const { SpacesPage } = await import('./spaces-page')

    mockCreateOrganization.mockResolvedValue({ id: 'org-1' })
    mockRefreshAuthSession.mockResolvedValue(undefined)
    mockInvalidate.mockResolvedValue(undefined)

    render(
      <SpacesPage
        loaderData={[
          {
            __typename: 'Space',
            id: 'space-1',
            orgId: 'org-shared',
            key: 'shared-space',
            name: 'Shared Space',
            storageUsageBytes: 0,
            processingUsageCount: 0,
            storageMode: 'platform',
            storageType: 'managed',
            bucket: '',
            prefix: '',
            region: '',
            endpoint: '',
            usePathStyle: false,
            customDomain: '',
            customDomainVerified: false,
            suspended: false,
            isShared: true,
            signerAlgorithm: '',
            signerTruncate: 0,
            imagorCORSOrigins: '',
            hasCustomImagorSecret: false,
            canManage: false,
            canDelete: false,
            canLeave: true,
            updatedAt: '2026-04-30T00:00:00Z',
          },
        ]}
        usageSummary={null}
        currentOrganizationId={null}
        canCreateSpace={false}
        canManageOrganization={false}
      />,
    )

    await act(async () => {
      await mockButtonWithLoading.mock.calls[0][0].onClick()
    })

    expect(mockCreateOrganization).toHaveBeenCalled()
    expect(mockRefreshAuthSession).toHaveBeenCalled()
    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalledWith('pages.workspaceRequired.actions.createSuccess')
  })

  it('shows over-limit recovery messaging for organization admins', async () => {
    const { SpacesPage } = await import('./spaces-page')

    render(
      <SpacesPage
        loaderData={[]}
        usageSummary={{
          __typename: 'UsageSummary',
          usedSpaces: 1,
          maxSpaces: 3,
          usedHostedStorageBytes: 10,
          storageLimitGB: 100,
          usedTransforms: 160000,
          transformsLimit: 150000,
          periodStart: '2026-05-01T00:00:00Z',
          periodEnd: '2026-06-01T00:00:00Z',
        }}
        currentOrganizationId='org-1'
        currentOrganizationPlan='pro'
        canCreateSpace={true}
        canManageOrganization={true}
      />,
    )

    expect(screen.getByText('pages.spaces.overLimit.title')).toBeTruthy()
    expect(screen.getByText('pages.spaces.overLimit.description')).toBeTruthy()
    expect(screen.getByText('pages.spaces.overLimit.messages.processing')).toBeTruthy()
    expect(screen.getByText('pages.spaces.overLimit.reviewBilling')).toBeTruthy()
  })

  it('exposes only one keyboard target for opening a space card', async () => {
    const { SpacesPage } = await import('./spaces-page')

    render(
      <SpacesPage
        loaderData={[
          {
            __typename: 'Space',
            id: 'space-1',
            orgId: 'org-1',
            key: 'alpha',
            name: 'Alpha Space',
            storageUsageBytes: 512,
            processingUsageCount: 12,
            storageMode: 'platform',
            storageType: 'managed',
            bucket: '',
            prefix: '',
            region: '',
            endpoint: '',
            usePathStyle: false,
            customDomain: '',
            customDomainVerified: false,
            suspended: false,
            isShared: false,
            signerAlgorithm: '',
            signerTruncate: 0,
            imagorCORSOrigins: '',
            hasCustomImagorSecret: false,
            canManage: true,
            canDelete: false,
            canLeave: false,
            updatedAt: '2026-04-30T00:00:00Z',
          },
        ]}
        usageSummary={null}
        currentOrganizationId='org-1'
        currentOrganizationPlan='pro'
        canCreateSpace={true}
        canManageOrganization={true}
      />,
    )

    expect(screen.getAllByLabelText('pages.spaces.openGallery: Alpha Space')).toHaveLength(1)
    expect(screen.getByLabelText('pages.spaces.configure')).toBeTruthy()
  })
})
