import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import {
  createBillingPortalSession,
  createCheckoutSession,
  deleteOrganization,
} from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { extractErrorInfo, isOrganizationRequiredError } from '@/lib/error-utils'
import { getPlanEntitlements, isUnlimitedLimit } from '@/lib/plan-entitlements'
import { cn } from '@/lib/utils'
import type { BillingLoaderData } from '@/loaders/account-loader'
import { useAuth } from '@/stores/auth-store'

interface AccountBillingRoutePageProps {
  loaderData: BillingLoaderData
}

const PAID_PLANS = ['starter', 'pro', 'team'] as const
const PLAN_RANKS: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
}
const PORTAL_MANAGED_STATUSES = ['active', 'trialing', 'past_due'] as const
const PORTAL_SYNC_RETRY_DELAYS_MS = [0, 4000, 4000, 4000] as const
const PORTAL_SYNC_SUCCESS_NOTICE_MS = 5000
const PLAN_PRICES: Record<(typeof PAID_PLANS)[number], string> = {
  starter: '$19',
  pro: '$69',
  team: '$199',
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function getPortalSyncOutcome(previousPlan: string, nextPlan: string) {
  const previousRank = PLAN_RANKS[previousPlan]
  const nextRank = PLAN_RANKS[nextPlan]

  if (previousRank == null || nextRank == null || previousRank === nextRank) {
    return 'updated' as const
  }

  return nextRank > previousRank ? ('upgrade' as const) : ('downgrade' as const)
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 Bytes'

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  const digits = index === 0 ? 0 : 1

  return `${value.toFixed(digits)} ${units[index]}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatUsagePeriodDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function getProgressValue(current: number, max: number | null | undefined) {
  if (max == null || max <= 0) {
    return 0
  }

  return Math.min((current / max) * 100, 100)
}

function getDeleteOrganizationErrorMessage(error: unknown, t: (key: string) => string): string {
  const errorInfo = extractErrorInfo(error)

  switch (errorInfo.reason) {
    case 'org_delete_current_owner_required':
      return t('pages.billing.danger.errors.ownerRequired')
    case 'org_delete_has_spaces':
      return t('pages.billing.danger.errors.deleteSpacesFirst')
    case 'org_delete_billing_active':
      return t('pages.billing.danger.errors.cancelBillingFirst')
    default:
      return errorInfo.message
  }
}

export function AccountBillingRoutePage({ loaderData }: AccountBillingRoutePageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const portalReturned =
    typeof window !== 'undefined' &&
    ['1', 'true'].includes(new URLSearchParams(window.location.search).get('portal_returned') ?? '')
  const { logout } = useAuth()
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [showPortalSyncNotice, setShowPortalSyncNotice] = useState(portalReturned)
  const [portalSyncing, setPortalSyncing] = useState(portalReturned)
  const [portalSyncSucceeded, setPortalSyncSucceeded] = useState(false)
  const [portalSyncOutcome, setPortalSyncOutcome] = useState<'upgrade' | 'downgrade' | 'updated'>(
    'updated',
  )
  const [portalSyncSuccessDetails, setPortalSyncSuccessDetails] = useState<{
    previousPlan: string
    previousStatus: string
  } | null>(null)
  const portalSyncBaselineRef = useRef<{ plan: string; status: string } | null>(null)
  const portalSyncActiveRef = useRef(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)

  const organization = loaderData.organization
  const usageSummary = loaderData.usageSummary
  const currentPlan = organization?.plan ?? 'free'
  const currentStatus = organization?.planStatus ?? 'canceled'
  const currentPlanLabel = t(`pages.spaces.plan.${currentPlan}`)
  const currentStatusLabel = t(`pages.billing.status.${currentStatus}`)
  const canOpenPortal = PAID_PLANS.includes(currentPlan as (typeof PAID_PLANS)[number])
  const isPortalManagedBilling =
    canOpenPortal &&
    PORTAL_MANAGED_STATUSES.includes(currentStatus as (typeof PORTAL_MANAGED_STATUSES)[number])
  const maxSpaces = usageSummary?.maxSpaces ?? null
  const usedSpaces = usageSummary?.usedSpaces ?? 0
  const spacesOverLimit =
    maxSpaces != null && !isUnlimitedLimit(maxSpaces) && usedSpaces > maxSpaces
  const storageLimitGB = usageSummary?.storageLimitGB ?? null
  const usedHostedStorageBytes = usageSummary?.usedHostedStorageBytes ?? 0
  const storageLimitBytes = storageLimitGB != null ? storageLimitGB * 1024 * 1024 * 1024 : null
  const storageOverLimit =
    storageLimitGB != null &&
    storageLimitBytes != null &&
    !isUnlimitedLimit(storageLimitGB) &&
    usedHostedStorageBytes > storageLimitBytes
  const transformsLimit = usageSummary?.transformsLimit ?? null
  const usedTransforms = usageSummary?.usedTransforms ?? 0
  const processingOverLimit =
    transformsLimit != null &&
    !isUnlimitedLimit(transformsLimit) &&
    usedTransforms > transformsLimit
  const hasAnyOverLimit = spacesOverLimit || storageOverLimit || processingOverLimit
  const overLimitMessages = [
    spacesOverLimit ? t('pages.billing.overLimit.messages.spaces') : null,
    storageOverLimit ? t('pages.billing.overLimit.messages.storage') : null,
    processingOverLimit ? t('pages.billing.overLimit.messages.processing') : null,
  ].filter((message): message is string => message !== null)
  const usagePeriod =
    usageSummary?.periodStart && usageSummary?.periodEnd
      ? t('pages.spaces.currentBillingPeriod', {
          start: formatUsagePeriodDate(usageSummary.periodStart),
          end: formatUsagePeriodDate(usageSummary.periodEnd),
        })
      : null

  useEffect(() => {
    if (selectedPlan === currentPlan) {
      setSelectedPlan(null)
    }
  }, [currentPlan, selectedPlan])

  const selectedPlanLabel = selectedPlan != null ? t(`pages.spaces.plan.${selectedPlan}`) : null
  const primaryBillingActionLabel = isPortalManagedBilling
    ? selectedPlanLabel != null
      ? t('pages.billing.manageBillingTarget', { plan: selectedPlanLabel })
      : t('pages.billing.manageBilling')
    : selectedPlanLabel != null
      ? t('pages.billing.selectPlanTarget', { plan: selectedPlanLabel })
      : t('pages.billing.selectPlan')

  const handlePrimaryBillingAction = async () => {
    if (isPortalManagedBilling) {
      await handleManageBilling()
      return
    }

    if (selectedPlan == null) {
      return
    }

    await handleCheckout(selectedPlan as (typeof PAID_PLANS)[number])
  }

  const handlePlanSelection = (plan: (typeof PAID_PLANS)[number]) => {
    setSelectedPlan((currentSelection) => (currentSelection === plan ? null : plan))
  }

  const usageItems = [
    {
      key: 'spaces',
      label: t('pages.billing.usage.spaces'),
      used: usedSpaces,
      limit: maxSpaces,
      overLimit: spacesOverLimit,
      displayValue:
        maxSpaces != null && !isUnlimitedLimit(maxSpaces)
          ? `${usedSpaces}/${maxSpaces}`
          : t('pages.billing.unlimited'),
    },
    {
      key: 'storage',
      label: t('pages.billing.usage.hostedStorage'),
      used: usedHostedStorageBytes,
      limit: storageLimitBytes,
      overLimit: storageOverLimit,
      displayValue:
        storageLimitGB != null && !isUnlimitedLimit(storageLimitGB)
          ? `${formatBytes(usedHostedStorageBytes)} / ${formatBytes(storageLimitBytes ?? 0)}`
          : t('pages.billing.unlimited'),
    },
    {
      key: 'processing',
      label: t('pages.billing.usage.processing'),
      used: usedTransforms,
      limit: transformsLimit,
      overLimit: processingOverLimit,
      displayValue:
        transformsLimit != null && !isUnlimitedLimit(transformsLimit)
          ? `${formatNumber(usedTransforms)} / ${formatNumber(transformsLimit)}`
          : t('pages.billing.unlimited'),
    },
  ]

  const handleCheckout = async (plan: (typeof PAID_PLANS)[number]) => {
    if (isPortalManagedBilling) {
      return
    }

    setPendingPlan(plan)
    try {
      const currentURL = window.location.href
      const session = await createCheckoutSession({
        plan,
        successURL: currentURL,
        cancelURL: currentURL,
      })
      window.location.assign(session.url)
    } catch (error) {
      if (isOrganizationRequiredError(error)) {
        await navigate({ to: '/account/workspace-required' })
        return
      }

      const errorInfo = extractErrorInfo(error)
      if (errorInfo.reason === 'billing_checkout_requires_portal') {
        await handleManageBilling()
        return
      }

      toast.error(`${t('pages.billing.messages.checkoutFailed')}: ${errorInfo.message}`)
    } finally {
      setPendingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const returnURL = new URL(window.location.href)
      returnURL.searchParams.set('portal_returned', '1')
      const session = await createBillingPortalSession({ returnURL: returnURL.toString() })
      window.location.assign(session.url)
    } catch (error) {
      if (isOrganizationRequiredError(error)) {
        await navigate({ to: '/account/workspace-required' })
        return
      }

      toast.error(`${t('pages.billing.messages.portalFailed')}: ${extractErrorInfo(error).message}`)
    } finally {
      setPortalLoading(false)
    }
  }

  const handleRefreshBillingStatus = async ({ silent = false }: { silent?: boolean } = {}) => {
    setRefreshLoading(true)
    try {
      await router.invalidate()
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : t('common.status.error')
        toast.error(`${t('pages.billing.messages.refreshFailed')}: ${message}`)
      }
    } finally {
      setRefreshLoading(false)
    }
  }

  useEffect(() => {
    const baseline = portalSyncBaselineRef.current
    if (!portalSyncActiveRef.current || baseline == null) {
      return
    }

    if (baseline.plan === currentPlan && baseline.status === currentStatus) {
      return
    }

    portalSyncActiveRef.current = false
    portalSyncBaselineRef.current = null
    setPortalSyncing(false)
    setPortalSyncOutcome(getPortalSyncOutcome(baseline.plan, currentPlan))
    setPortalSyncSuccessDetails({ previousPlan: baseline.plan, previousStatus: baseline.status })
    setPortalSyncSucceeded(true)
    setShowPortalSyncNotice(true)
  }, [currentPlan, currentStatus])

  useEffect(() => {
    if (!portalSyncSucceeded) {
      return
    }

    const timeout = window.setTimeout(() => {
      setShowPortalSyncNotice(false)
      setPortalSyncSucceeded(false)
      setPortalSyncSuccessDetails(null)
    }, PORTAL_SYNC_SUCCESS_NOTICE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [portalSyncSucceeded])

  useEffect(() => {
    if (!portalReturned) {
      return
    }

    let cancelled = false
    portalSyncBaselineRef.current = { plan: currentPlan, status: currentStatus }
    portalSyncActiveRef.current = true

    setShowPortalSyncNotice(true)
    setPortalSyncing(true)
    setPortalSyncSucceeded(false)
    setPortalSyncOutcome('updated')
    setPortalSyncSuccessDetails(null)

    void navigate({
      to: '/account/organization/billing',
      search: {},
      replace: true,
    })

    void (async () => {
      for (const delayMs of PORTAL_SYNC_RETRY_DELAYS_MS) {
        if (delayMs > 0) {
          await wait(delayMs)
        }

        if (cancelled || !portalSyncActiveRef.current) {
          return
        }

        await handleRefreshBillingStatus({ silent: true })

        if (cancelled || !portalSyncActiveRef.current) {
          return
        }
      }

      portalSyncActiveRef.current = false
      portalSyncBaselineRef.current = null
      setPortalSyncing(false)
    })()

    return () => {
      cancelled = true
      portalSyncActiveRef.current = false
    }
  }, [navigate, portalReturned])

  const handleDeleteOrganization = async () => {
    setDeleteLoading(true)
    try {
      await deleteOrganization()
      await logout()
      toast.success(t('pages.billing.danger.messages.deleted'))
      await navigate({ to: '/login' })
    } catch (error) {
      toast.error(
        `${t('pages.billing.danger.messages.deleteFailed')}: ${getDeleteOrganizationErrorMessage(error, t)}`,
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className='space-y-8'>
      <div>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('pages.billing.title')}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('pages.billing.titleDescription')}
          </p>
        </div>
      </div>

      <div className='bg-muted/30 rounded-lg border p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-sm font-medium'>{t('pages.spaces.usageSummaryTitle')}</p>
              <Badge variant='secondary'>{t(`pages.spaces.plan.${currentPlan}`)}</Badge>
              {currentStatus !== 'trialing' ? (
                <Badge variant='outline'>{t(`pages.billing.status.${currentStatus}`)}</Badge>
              ) : null}
            </div>
            {usagePeriod && <p className='text-muted-foreground text-xs'>{usagePeriod}</p>}
          </div>

          {hasAnyOverLimit && (
            <Badge
              variant='outline'
              className='w-fit border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
            >
              {t('pages.spaces.messages.overPlanLimit')}
            </Badge>
          )}
        </div>

        <div className='mt-4 grid gap-4 sm:grid-cols-3'>
          {usageItems.map((item) => (
            <div key={item.key} className='space-y-2'>
              <div className='flex items-center justify-between gap-3 text-sm'>
                <span className='font-medium'>{item.label}</span>
                <div className='flex items-center gap-2'>
                  {item.overLimit && (
                    <Badge
                      variant='outline'
                      className='border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                    >
                      {t('pages.spaces.usage.overLimit')}
                    </Badge>
                  )}
                  <span
                    className={
                      item.overLimit
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-muted-foreground'
                    }
                  >
                    {item.displayValue}
                  </span>
                </div>
              </div>
              <Progress
                value={getProgressValue(item.used, item.limit)}
                className={item.overLimit ? 'bg-amber-500/15 dark:bg-amber-400/15' : undefined}
                indicatorClassName={item.overLimit ? 'bg-amber-500 dark:bg-amber-400' : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {hasAnyOverLimit && (
        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-50'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <p className='text-sm font-semibold'>{t('pages.billing.overLimit.title')}</p>
              <p className='text-sm'>{t('pages.billing.overLimit.description')}</p>
              <div className='space-y-1 text-sm'>
                {overLimitMessages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPortalSyncNotice && (
        <div
          className={
            portalSyncSucceeded
              ? 'rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50'
              : 'bg-muted/30 text-foreground border-border/60 rounded-lg border p-4'
          }
        >
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-1'>
              <p className='text-sm font-semibold'>
                {t(
                  portalSyncSucceeded
                    ? portalSyncOutcome === 'upgrade'
                      ? 'pages.billing.portalSync.successUpgradeTitle'
                      : portalSyncOutcome === 'downgrade'
                        ? 'pages.billing.portalSync.successDowngradeTitle'
                        : 'pages.billing.portalSync.successUpdatedTitle'
                    : 'pages.billing.portalSync.title',
                )}
              </p>
              <p className='text-sm'>
                {t(
                  portalSyncSucceeded
                    ? portalSyncOutcome === 'upgrade'
                      ? 'pages.billing.portalSync.successUpgradeDescription'
                      : portalSyncOutcome === 'downgrade'
                        ? 'pages.billing.portalSync.successDowngradeDescription'
                        : 'pages.billing.portalSync.successUpdatedDescription'
                    : portalSyncing
                      ? 'pages.billing.portalSync.syncingDescription'
                      : 'pages.billing.portalSync.waitingDescription',
                  portalSyncSucceeded
                    ? {
                        previousPlan: portalSyncSuccessDetails
                          ? t(`pages.spaces.plan.${portalSyncSuccessDetails.previousPlan}`)
                          : currentPlanLabel,
                        previousStatus: portalSyncSuccessDetails
                          ? t(`pages.billing.status.${portalSyncSuccessDetails.previousStatus}`)
                          : currentStatusLabel,
                        plan: currentPlanLabel,
                        status: currentStatusLabel,
                      }
                    : undefined,
                )}
              </p>
            </div>

            {!portalSyncSucceeded && !portalSyncing && (
              <ButtonWithLoading
                variant='outline'
                isLoading={refreshLoading}
                onClick={() => void handleRefreshBillingStatus()}
                className='w-full shrink-0 sm:w-auto'
              >
                {t('pages.billing.portalManaged.refreshAction')}
              </ButtonWithLoading>
            )}
          </div>
        </div>
      )}

      <section className='border-border/60 space-y-5 rounded-xl border bg-transparent p-4 md:p-5'>
        <div className='grid gap-4 xl:grid-cols-3'>
          {PAID_PLANS.map((plan) => {
            const entitlements = getPlanEntitlements(plan)
            const isCurrentPlan = plan === currentPlan
            const isSelectedPlan = selectedPlan === plan
            const customDomainAllowance = entitlements.maxCustomDomains
            const isSelectable = !isCurrentPlan

            return (
              <Card
                key={plan}
                className={cn(
                  isCurrentPlan && 'border-primary shadow-sm',
                  isSelectedPlan && 'border-primary bg-muted/30 ring-primary/20 shadow-md ring-2',
                  isSelectable &&
                    'hover:border-primary/60 cursor-pointer transition-[border-color,box-shadow,background-color]',
                )}
                role={isSelectable ? 'button' : undefined}
                aria-pressed={isSelectable ? isSelectedPlan : undefined}
                tabIndex={isSelectable ? 0 : undefined}
                onClick={
                  isSelectable
                    ? () => {
                        handlePlanSelection(plan)
                      }
                    : undefined
                }
                onKeyDown={
                  isSelectable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handlePlanSelection(plan)
                        }
                      }
                    : undefined
                }
              >
                <CardHeader>
                  <div className='flex items-center justify-between gap-3'>
                    <CardTitle>{t(`pages.spaces.plan.${plan}`)}</CardTitle>
                    {isCurrentPlan ? (
                      <Badge>{t('pages.billing.currentPlanBadge')}</Badge>
                    ) : isSelectedPlan ? (
                      <Badge variant='outline'>{t('pages.billing.selectedPlanBadge')}</Badge>
                    ) : null}
                  </div>
                  <CardDescription>{t(`pages.billing.planDescriptions.${plan}`)}</CardDescription>
                  <div className='flex items-end gap-1 pt-1'>
                    <span className='text-2xl font-semibold tracking-tight'>
                      {PLAN_PRICES[plan]}
                    </span>
                    <span className='text-muted-foreground text-sm'>
                      {t('pages.billing.priceSuffix')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2 text-sm'>
                    <div className='flex items-center justify-between gap-4'>
                      <span>{t('pages.billing.planMetrics.spaces')}</span>
                      <span className='font-medium'>{formatNumber(entitlements.maxSpaces)}</span>
                    </div>
                    <div className='flex items-center justify-between gap-4'>
                      <span>{t('pages.billing.planMetrics.hostedStorage')}</span>
                      <span className='font-medium'>{entitlements.storageLimitGB} GB</span>
                    </div>
                    <div className='flex items-center justify-between gap-4'>
                      <span>{t('pages.billing.planMetrics.processing')}</span>
                      <span className='font-medium'>
                        {formatNumber(entitlements.transformsLimit)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-4'>
                      <span>{t('pages.billing.planMetrics.customDomains')}</span>
                      <span className='font-medium'>
                        {customDomainAllowance > 0
                          ? t('pages.billing.customDomainsIncluded', {
                              count: customDomainAllowance,
                            })
                          : t('pages.billing.customDomainsUnavailable')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className='border-border/60 border-t pt-4'>
          <div className='flex justify-end'>
            <ButtonWithLoading
              variant='default'
              isLoading={portalLoading || (selectedPlan != null && pendingPlan === selectedPlan)}
              onClick={() => void handlePrimaryBillingAction()}
              disabled={!isPortalManagedBilling && selectedPlan == null}
              className='w-full sm:w-auto'
            >
              {primaryBillingActionLabel}
            </ButtonWithLoading>
          </div>
        </div>
      </section>

      <div className='mt-4 border-t pt-8'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-destructive -ml-2'
          onClick={() => setDangerZoneOpen((open) => !open)}
        >
          {dangerZoneOpen ? (
            <ChevronDown className='mr-2 h-3.5 w-3.5' />
          ) : (
            <ChevronRight className='mr-2 h-3.5 w-3.5' />
          )}
          {t('pages.billing.danger.title')}
        </Button>

        {dangerZoneOpen ? (
          <div className='mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='min-w-0 space-y-2'>
              <p className='font-medium'>{t('pages.billing.danger.deleteTitle')}</p>
              <p className='text-muted-foreground text-sm'>
                {t('pages.billing.danger.deleteDescription')}
              </p>
              <p className='text-muted-foreground text-sm'>
                {t('pages.billing.danger.deleteChecklist')}
              </p>
            </div>
            <Button
              variant='destructive'
              className='shrink-0'
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t('pages.billing.danger.deleteButton')}
            </Button>
          </div>
        ) : null}
      </div>

      <ResponsiveDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('pages.billing.danger.confirmTitle')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('pages.billing.danger.confirmDescription', {
              name: organization?.name ?? t('pages.billing.danger.organizationFallback'),
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='outline'
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
            className='w-full sm:w-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
          <ButtonWithLoading
            variant='destructive'
            isLoading={deleteLoading}
            onClick={handleDeleteOrganization}
            className='w-full sm:w-auto'
          >
            {t('pages.billing.danger.deleteButton')}
          </ButtonWithLoading>
        </ResponsiveDialogFooter>
      </ResponsiveDialog>
    </div>
  )
}
