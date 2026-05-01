import { useState } from 'react'
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
import type { BillingLoaderData } from '@/loaders/account-loader'
import { useAuth } from '@/stores/auth-store'

interface AccountBillingRoutePageProps {
  loaderData: BillingLoaderData
}

const PAID_PLANS = ['starter', 'pro', 'team'] as const
const PORTAL_MANAGED_STATUSES = ['active', 'trialing', 'past_due'] as const
const PLAN_PRICES: Record<(typeof PAID_PLANS)[number], string> = {
  starter: '$19',
  pro: '$69',
  team: '$199',
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
  const { logout } = useAuth()
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)

  const organization = loaderData.organization
  const usageSummary = loaderData.usageSummary
  const currentPlan = organization?.plan ?? 'free'
  const currentStatus = organization?.planStatus ?? 'canceled'
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
      const session = await createBillingPortalSession({ returnURL: window.location.href })
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

  const handleRefreshBillingStatus = async () => {
    setRefreshLoading(true)
    try {
      await router.invalidate()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.status.error')
      toast.error(`${t('pages.billing.messages.refreshFailed')}: ${message}`)
    } finally {
      setRefreshLoading(false)
    }
  }

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
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('pages.billing.title')}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('pages.billing.titleDescription')}
          </p>
        </div>

        {canOpenPortal && (
          <ButtonWithLoading
            variant='outline'
            isLoading={portalLoading}
            onClick={handleManageBilling}
            className='w-full sm:w-auto'
          >
            {t('pages.billing.manageBilling')}
          </ButtonWithLoading>
        )}
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

            {canOpenPortal && (
              <ButtonWithLoading
                variant='outline'
                isLoading={portalLoading}
                onClick={handleManageBilling}
                className='w-full shrink-0 sm:w-auto'
              >
                {t('pages.billing.manageBilling')}
              </ButtonWithLoading>
            )}
          </div>
        </div>
      )}

      {isPortalManagedBilling && (
        <div className='bg-muted/20 rounded-lg border p-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <p className='text-sm font-medium'>{t('pages.billing.portalManaged.title')}</p>
              <p className='text-muted-foreground mt-1 text-sm'>
                {t(
                  hasAnyOverLimit
                    ? 'pages.billing.portalManaged.overLimitDescription'
                    : 'pages.billing.portalManaged.description',
                )}
              </p>
            </div>

            <ButtonWithLoading
              variant='outline'
              isLoading={refreshLoading}
              onClick={handleRefreshBillingStatus}
              className='w-full shrink-0 sm:w-auto'
            >
              {t('pages.billing.portalManaged.refreshAction')}
            </ButtonWithLoading>
          </div>
        </div>
      )}

      <div className='grid gap-4 xl:grid-cols-3'>
        {PAID_PLANS.map((plan) => {
          const entitlements = getPlanEntitlements(plan)
          const isCurrentPlan = plan === currentPlan
          const isPortalManagedPlanAction = isPortalManagedBilling && !isCurrentPlan
          const isPlanActionDisabled = isCurrentPlan
          const buttonLabel = isCurrentPlan
            ? t('pages.billing.currentPlanButton')
            : isPortalManagedPlanAction
              ? t('pages.billing.managePlanInBilling')
              : t('pages.billing.selectPlan')
          const customDomainAllowance = entitlements.maxCustomDomains

          return (
            <Card key={plan} className={isCurrentPlan ? 'border-primary shadow-sm' : undefined}>
              <CardHeader>
                <div className='flex items-center justify-between gap-3'>
                  <CardTitle>{t(`pages.spaces.plan.${plan}`)}</CardTitle>
                  {isCurrentPlan && <Badge>{t('pages.billing.currentPlanBadge')}</Badge>}
                </div>
                <CardDescription>{t(`pages.billing.planDescriptions.${plan}`)}</CardDescription>
                <div className='flex items-end gap-1 pt-1'>
                  <span className='text-2xl font-semibold tracking-tight'>{PLAN_PRICES[plan]}</span>
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

                <ButtonWithLoading
                  isLoading={isPortalManagedPlanAction ? portalLoading : pendingPlan === plan}
                  disabled={isPlanActionDisabled}
                  onClick={() => {
                    if (isPortalManagedPlanAction) {
                      void handleManageBilling()
                      return
                    }

                    void handleCheckout(plan)
                  }}
                  className='w-full'
                >
                  {buttonLabel}
                </ButtonWithLoading>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className='bg-muted/20 rounded-lg border p-4'>
        <p className='text-sm font-medium'>{t('pages.billing.sharedFeaturesTitle')}</p>
        <div className='text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm'>
          <span>{t('pages.billing.sharedFeatures.collaboration')}</span>
          <span>{t('pages.billing.sharedFeatures.orgSharing')}</span>
          <span>{t('pages.billing.sharedFeatures.byob')}</span>
        </div>
      </div>

      <div className='border-t pt-6'>
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
