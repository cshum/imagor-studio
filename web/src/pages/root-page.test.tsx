import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  Outlet: () => <div data-testid='outlet' />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/layouts/sidebar-layout', () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='sidebar-layout'>{children}</div>
  ),
}))

vi.mock('@/layouts/spaces-layout', () => ({
  SpacesLayout: ({ title, description, primaryAction, children }: any) => (
    <div data-testid='spaces-layout'>
      <div>{title}</div>
      <div>{description}</div>
      {primaryAction}
      {children}
    </div>
  ),
}))

vi.mock('@/pages/gallery-page', () => ({
  GalleryPage: ({ galleryKey }: any) => <div>gallery:{galleryKey}</div>,
}))

vi.mock('@/pages/spaces-page', () => ({
  SpacesPage: ({ currentOrganizationId, currentOrganizationPlan }: any) => (
    <div>
      spaces:{currentOrganizationId}:{currentOrganizationPlan}
    </div>
  ),
}))

describe('RootPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the spaces shell from route-owned multi-tenant data', async () => {
    const { RootPage } = await import('./root-page')

    render(
      <RootPage
        spacesData={{
          breadcrumb: { translationKey: 'navigation.breadcrumbs.spaces' },
          spaces: [],
          usageSummary: {
            __typename: 'UsageSummary',
            usedSpaces: 1,
            maxSpaces: 3,
            usedHostedStorageBytes: 1024,
            storageLimitGB: 10,
            usedTransforms: 5,
            transformsLimit: 100,
            periodStart: '2026-05-01T00:00:00Z',
            periodEnd: '2026-06-01T00:00:00Z',
          },
          currentOrganizationId: 'org-1',
          currentOrganizationRole: 'owner',
          currentOrganizationPlan: 'trial',
          currentOrganizationPlanStatus: 'active',
        }}
      />,
    )

    expect(screen.getByTestId('spaces-layout')).toBeTruthy()
    expect(screen.getByText('pages.spaces.title')).toBeTruthy()
    expect(screen.getByText('spaces:org-1:trial')).toBeTruthy()
    expect(screen.queryByTestId('sidebar-layout')).toBeNull()
  })

  it('renders the self-hosted gallery surface from loader data', async () => {
    const { RootPage } = await import('./root-page')

    render(
      <RootPage
        galleryLoaderData={{
          galleryName: 'Home',
          galleryKey: '',
          images: [],
          folders: [],
          breadcrumbs: [],
          imageExtensions: 'jpg',
          videoExtensions: 'mp4',
          currentSortBy: 'MODIFIED_TIME',
          currentSortOrder: 'DESC',
          showFileNames: false,
        }}
      />,
    )

    expect(screen.getByTestId('sidebar-layout')).toBeTruthy()
    expect(screen.getByText('gallery:')).toBeTruthy()
    expect(screen.queryByTestId('spaces-layout')).toBeNull()
  })
})