import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { createBillingPortalSession, createCheckoutSession } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getPlanEntitlements, isUnlimitedLimit } from '@/lib/plan-entitlements'
import type { BillingLoaderData } from '@/loaders/account-loader'

interface AccountBillingRoutePageProps {
  loaderData: BillingLoaderData
}

const PAID_PLANS = ['starter', 'pro', 'team'] as const

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

export function AccountBillingRoutePage({ loaderData }: AccountBillingRoutePageProps) {
  const { t } = useTranslation()
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const organization = loaderData.organization
  const usageSummary = loaderData.usageSummary
  const currentPlan = organization?.plan ?? 'free'
  const currentStatus = organization?.planStatus ?? 'canceled'
  const canOpenPortal = PAID_PLANS.includes(currentPlan as (typeof PAID_PLANS)[number])
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
      toast.error(
        `${t('pages.billing.messages.checkoutFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      )
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
      toast.error(
        `${t('pages.billing.messages.portalFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      setPortalLoading(false)
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

      <div className='bg-muted/30 rounded-xl border p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-sm font-medium'>{t('pages.spaces.usageSummaryTitle')}</p>
              <Badge variant='secondary'>{t(`pages.spaces.plan.${currentPlan}`)}</Badge>
              <Badge variant='outline'>{t(`pages.billing.status.${currentStatus}`)}</Badge>
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

      <div className='grid gap-4 xl:grid-cols-3'>
        {PAID_PLANS.map((plan) => {
          const entitlements = getPlanEntitlements(plan)
          const isCurrentPlan = plan === currentPlan
          const buttonLabel = isCurrentPlan
            ? t('pages.billing.currentPlanButton')
            : t('pages.billing.selectPlan')

          return (
            <Card key={plan} className={isCurrentPlan ? 'border-primary shadow-sm' : undefined}>
              <CardHeader>
                <div className='flex items-center justify-between gap-3'>
                  <CardTitle>{t(`pages.spaces.plan.${plan}`)}</CardTitle>
                  {isCurrentPlan && <Badge>{t('pages.billing.currentPlanBadge')}</Badge>}
                </div>
                <CardDescription>{t(`pages.billing.planDescriptions.${plan}`)}</CardDescription>
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
                </div>

                <ButtonWithLoading
                  isLoading={pendingPlan === plan}
                  disabled={isCurrentPlan}
                  onClick={() => handleCheckout(plan)}
                  className='w-full'
                >
                  {buttonLabel}
                </ButtonWithLoading>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
