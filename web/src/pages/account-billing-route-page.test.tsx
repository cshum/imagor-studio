import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BillingLoaderData } from '@/loaders/account-loader'

const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()
const mockCreateCheckoutSession = vi.fn()
const mockCreateBillingPortalSession = vi.fn()
const mockDeleteOrganization = vi.fn()
const mockLogout = vi.fn()
const mockLocationAssign = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('lucide-react', () => {
  const Icon = () => <svg />
  return {
    ChevronDown: Icon,
    ChevronRight: Icon,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

vi.mock('@/api/org-api', async () => {
  const actual = await vi.importActual<typeof import('@/api/org-api')>('@/api/org-api')
  return {
    ...actual,
    createBillingPortalSession: mockCreateBillingPortalSession,
    createCheckoutSession: mockCreateCheckoutSession,
    deleteOrganization: mockDeleteOrganization,
  }
})

vi.mock('@/stores/auth-store', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}))

vi.mock('@/lib/error-utils', () => ({
  extractErrorInfo: (error: any) => ({
    message:
      error?.response?.errors?.[0]?.message ?? error?.message ?? error?.reason ?? 'Unknown error',
    reason: error?.response?.errors?.[0]?.extensions?.reason ?? error?.reason,
  }),
  isOrganizationRequiredError: (error: any) =>
    error?.response?.errors?.[0]?.extensions?.reason === 'organization_required',
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/button-with-loading', () => ({
  ButtonWithLoading: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{isLoading ? 'loading' : children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: () => <div data-testid='progress' />,
}))

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogDescription: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogFooter: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogHeader: ({ children }: any) => <div>{children}</div>,
  ResponsiveDialogTitle: ({ children }: any) => <div>{children}</div>,
}))

function createLoaderData(
  organizationOverrides: Partial<NonNullable<BillingLoaderData['organization']>> = {},
  usageSummaryOverrides: Partial<NonNullable<BillingLoaderData['usageSummary']>> = {},
): BillingLoaderData {
  return {
    breadcrumb: { translationKey: 'navigation.breadcrumbs.billing' },
    organization: {
      __typename: 'Organization',
      id: 'org-1',
      name: 'Acme Org',
      slug: 'acme',
      ownerUserId: 'user-1',
      currentUserRole: 'owner',
      plan: 'trial',
      planStatus: 'trialing',
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z',
      ...organizationOverrides,
    } as BillingLoaderData['organization'],
    usageSummary: {
      __typename: 'UsageSummary',
      usedSpaces: 0,
      maxSpaces: 1,
      usedHostedStorageBytes: 0,
      storageLimitGB: 1,
      usedTransforms: 0,
      transformsLimit: 1000,
      periodStart: '2026-05-01T00:00:00Z',
      periodEnd: '2026-06-01T00:00:00Z',
      ...usageSummaryOverrides,
    } as BillingLoaderData['usageSummary'],
  }
}

describe('AccountBillingRoutePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockNavigate.mockResolvedValue(undefined)
    vi.stubGlobal('location', {
      ...window.location,
      assign: mockLocationAssign,
      href: 'http://localhost/',
    })
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.example/session' })
    mockCreateBillingPortalSession.mockResolvedValue({ url: 'https://billing.example/portal' })
    mockDeleteOrganization.mockResolvedValue(true)
    mockLogout.mockResolvedValue(undefined)
    mockInvalidate.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts checkout for a trial organization selecting a paid plan', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(<AccountBillingRoutePage loaderData={createLoaderData()} />)

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'pages.billing.selectPlan' })[0])
    })

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'starter',
      }),
    )
    expect(mockCreateBillingPortalSession).not.toHaveBeenCalled()
  })

  it('starts checkout for the internal lapsed free state selecting a paid plan', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'free',
          planStatus: 'canceled',
        })}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'pages.billing.selectPlan' })[1])
    })

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro',
      }),
    )
    expect(mockCreateBillingPortalSession).not.toHaveBeenCalled()
  })

  it('routes active paid organizations through the billing portal instead of checkout', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'starter',
          planStatus: 'active',
        })}
      />,
    )

    const planButtons = screen.getAllByRole('button', { name: 'pages.billing.managePlanInBilling' })
    expect(planButtons).toHaveLength(2)
    expect(planButtons.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true)

    await act(async () => {
      fireEvent.click(planButtons[0])
    })

    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()

    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        returnURL: expect.any(String),
      }),
    )
  })

  it('keeps the current plan disabled for past due paid organizations', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'pro',
          planStatus: 'past_due',
        })}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'pages.billing.currentPlanButton' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    const planButtons = screen.getAllByRole('button', { name: 'pages.billing.managePlanInBilling' })
    expect(planButtons).toHaveLength(2)
    expect(planButtons.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true)

    await act(async () => {
      fireEvent.click(planButtons[0])
    })

    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        returnURL: expect.any(String),
      }),
    )
  })

  it('shows the existing sanitized portal error path when portal creation fails', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')
    mockCreateBillingPortalSession.mockRejectedValue(new Error('portal down'))

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'team',
          planStatus: 'active',
        })}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pages.billing.manageBilling' }))
    })

    expect(mockToastError).toHaveBeenCalledTimes(1)
    expect(mockToastError).toHaveBeenCalledWith('pages.billing.messages.portalFailed: portal down')
  })

  it('falls back to the billing portal when checkout must use portal-managed billing', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')
    mockCreateCheckoutSession.mockRejectedValue({
      response: {
        errors: [
          {
            message: 'existing paid subscriptions must use the billing portal',
            extensions: {
              reason: 'billing_checkout_requires_portal',
            },
          },
        ],
      },
    })

    render(<AccountBillingRoutePage loaderData={createLoaderData()} />)

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'pages.billing.selectPlan' })[0])
    })

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'starter',
      }),
    )
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        returnURL: expect.any(String),
      }),
    )
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('shows recovery messaging when the organization is over the processing limit', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData(
          {
            plan: 'pro',
            planStatus: 'active',
          },
          {
            usedTransforms: 160000,
            transformsLimit: 150000,
          },
        )}
      />,
    )

    expect(screen.getByText('pages.billing.overLimit.title')).toBeTruthy()
    expect(screen.getByText('pages.billing.overLimit.description')).toBeTruthy()
    expect(screen.getByText('pages.billing.overLimit.messages.processing')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'pages.billing.manageBilling' }).length).toBe(2)
  })

  it('shows portal-managed downgrade guidance for paid organizations over limit', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData(
          {
            plan: 'pro',
            planStatus: 'active',
          },
          {
            usedHostedStorageBytes: 3 * 1024 * 1024 * 1024,
            storageLimitGB: 2,
          },
        )}
      />,
    )

    expect(screen.getByText('pages.billing.portalManaged.title')).toBeTruthy()
    expect(screen.getByText('pages.billing.portalManaged.overLimitDescription')).toBeTruthy()
  })

  it('lets portal-managed billing refresh synced status after returning from the portal', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')

    render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'team',
          planStatus: 'active',
        })}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pages.billing.portalManaged.refreshAction' }))
    })

    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('retries billing sync after returning from the billing portal before falling back to waiting state', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')
    vi.useFakeTimers()
    vi.stubGlobal('location', {
      ...window.location,
      assign: mockLocationAssign,
      href: 'http://localhost/account/organization/billing?portal_returned=1',
      search: '?portal_returned=1',
    })

    await act(async () => {
      render(
        <AccountBillingRoutePage
          loaderData={createLoaderData({
            plan: 'pro',
            planStatus: 'active',
          })}
        />,
      )
      await Promise.resolve()
    })

    expect(screen.getByText('pages.billing.portalSync.title')).toBeTruthy()
    expect(screen.getByText('pages.billing.portalSync.syncingDescription')).toBeTruthy()
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/account/organization/billing',
      search: { portal_returned: false },
      replace: true,
    })

    expect(mockInvalidate).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000)
    })

    expect(mockInvalidate).toHaveBeenCalledTimes(4)
    expect(screen.getByText('pages.billing.portalSync.waitingDescription')).toBeTruthy()
  })

  it('stops retrying early when synced billing state changes after portal return', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')
    vi.useFakeTimers()
    vi.stubGlobal('location', {
      ...window.location,
      assign: mockLocationAssign,
      href: 'http://localhost/account/organization/billing?portal_returned=1',
      search: '?portal_returned=1',
    })

    const view = render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'starter',
          planStatus: 'active',
        })}
      />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockInvalidate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('pages.billing.portalSync.syncingDescription')).toBeTruthy()

    await act(async () => {
      view.rerender(
        <AccountBillingRoutePage
          loaderData={createLoaderData({
            plan: 'team',
            planStatus: 'active',
          })}
        />,
      )
      await Promise.resolve()
    })

    expect(screen.getByText('pages.billing.portalSync.successUpgradeTitle')).toBeTruthy()
    expect(
      screen.getByText(
        'pages.billing.portalSync.successUpgradeDescription:{"previousPlan":"pages.spaces.plan.starter","previousStatus":"pages.billing.status.active","plan":"pages.spaces.plan.team","status":"pages.billing.status.active"}',
      ),
    ).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'pages.billing.portalManaged.refreshAction' })).toHaveLength(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000)
    })

    expect(mockInvalidate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('pages.billing.portalSync.successUpgradeTitle')).toBeNull()
  })

  it('shows a downgrade success state when synced billing data lands on a lower plan', async () => {
    const { AccountBillingRoutePage } = await import('./account-billing-route-page')
    vi.useFakeTimers()
    vi.stubGlobal('location', {
      ...window.location,
      assign: mockLocationAssign,
      href: 'http://localhost/account/organization/billing?portal_returned=1',
      search: '?portal_returned=1',
    })

    const view = render(
      <AccountBillingRoutePage
        loaderData={createLoaderData({
          plan: 'team',
          planStatus: 'active',
        })}
      />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      view.rerender(
        <AccountBillingRoutePage
          loaderData={createLoaderData({
            plan: 'starter',
            planStatus: 'active',
          })}
        />,
      )
      await Promise.resolve()
    })

    expect(screen.getByText('pages.billing.portalSync.successDowngradeTitle')).toBeTruthy()
    expect(
      screen.getByText(
        'pages.billing.portalSync.successDowngradeDescription:{"previousPlan":"pages.spaces.plan.team","previousStatus":"pages.billing.status.active","plan":"pages.spaces.plan.starter","status":"pages.billing.status.active"}',
      ),
    ).toBeTruthy()
  })
})
