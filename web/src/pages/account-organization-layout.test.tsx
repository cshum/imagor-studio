import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseMatches = vi.fn()
const mockUseRouterState = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid='organization-outlet' />,
  useMatches: () => mockUseMatches(),
  useRouterState: () => mockUseRouterState(),
}))

describe('AccountOrganizationLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the committed route match to highlight the active tab', async () => {
    const { AccountOrganizationLayout } = await import('./account-organization-layout')

    mockUseMatches.mockReturnValue([
      { pathname: '/account/organization' },
      { pathname: '/account/organization/members' },
    ])
    mockUseRouterState.mockReturnValue({
      location: { pathname: '/account/organization/billing' },
    })

    render(<AccountOrganizationLayout currentUserRole='admin' />)

    const billingTab = screen.getByText('layouts.account.tabs.billing')
    const membersTab = screen.getByText('navigation.breadcrumbs.organizationMembers')

    expect(billingTab.className).not.toContain('border-primary')
    expect(membersTab.className).toContain('border-primary')
  })

  it('hides the billing tab for non-admin members', async () => {
    const { AccountOrganizationLayout } = await import('./account-organization-layout')

    mockUseMatches.mockReturnValue([{ pathname: '/account/organization/members' }])
    mockUseRouterState.mockReturnValue({
      location: { pathname: '/account/organization/members' },
    })

    render(<AccountOrganizationLayout currentUserRole='member' />)

    expect(screen.queryByText('layouts.account.tabs.billing')).toBeNull()
    expect(screen.getByText('navigation.breadcrumbs.organizationMembers')).toBeTruthy()
  })
})