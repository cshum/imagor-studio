import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrgOverviewLoaderData } from '@/loaders/account-loader'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <div>{children}</div>
    }
    return <button {...props}>{children}</button>
  },
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

function createLoaderData(): OrgOverviewLoaderData {
  return {
    breadcrumb: { translationKey: 'navigation.breadcrumbs.organization' },
    organization: {
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'owner',
      plan: 'pro',
      planStatus: 'active',
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z',
    },
    usageSummary: {
      __typename: 'UsageSummary',
      usedSpaces: 1,
      maxSpaces: 3,
      usedHostedStorageBytes: 10,
      storageLimitGB: 100,
      usedTransforms: 160000,
      transformsLimit: 150000,
      periodStart: '2026-05-01T00:00:00Z',
      periodEnd: '2026-06-01T00:00:00Z',
    },
  }
}

describe('AccountOrganizationOverviewRoutePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows over-limit recovery messaging when the organization is above its processing allowance', async () => {
    const { AccountOrganizationOverviewRoutePage } = await import(
      './account-organization-overview-route-page'
    )

    render(<AccountOrganizationOverviewRoutePage loaderData={createLoaderData()} />)

    expect(screen.getByText('pages.organizationOverview.overLimit.title')).toBeTruthy()
    expect(screen.getByText('pages.organizationOverview.overLimit.description')).toBeTruthy()
    expect(screen.getByText('pages.organizationOverview.overLimit.messages.processing')).toBeTruthy()
    expect(screen.getAllByText('pages.organizationOverview.actions.reviewBilling').length).toBe(2)
  })
})