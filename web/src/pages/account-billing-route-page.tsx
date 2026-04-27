import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { createBillingPortalSession, createCheckoutSession } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { BillingLoaderData } from '@/loaders/account-loader'
import { getPlanEntitlements, isUnlimitedLimit } from '@/lib/plan-entitlements'

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

function getProgressValue(current: number, max: number | null | undefined) {
  if (max == null || max <= 0) {
    return 0
  }

  return Math.min((current / max) * 100, 100)
}

function formatUsagePeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) {
    return null
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}

export function AccountBillingRoutePage({ loaderData }: AccountBillingRoutePageProps) {
  const { t } = useTranslation()
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const organization = loaderData.organization
  const usageSummary = loaderData.usageSummary
  const currentPlan = organization?.plan ?? 'free'
  const currentStatus = organization?.planStatus ?? 'canceled'
  const periodLabel = formatUsagePeriod(usageSummary?.periodStart, usageSummary?.periodEnd)
  const canOpenPortal = PAID_PLANS.includes(currentPlan as (typeof PAID_PLANS)[number])

  const usageItems = [
    {
      key: 'spaces',
      label: t('pages.billing.usage.spaces'),
      used: usageSummary?.usedSpaces ?? 0,
      limit: usageSummary?.maxSpaces ?? null,
      displayValue:
        usageSummary?.maxSpaces != null && !isUnlimitedLimit(usageSummary.maxSpaces)
          ? `${usageSummary.usedSpaces}/${usageSummary.maxSpaces}`
          : t('pages.billing.unlimited'),
    },
    {
      key: 'storage',
      label: t('pages.billing.usage.hostedStorage'),
      used: usageSummary?.usedHostedStorageBytes ?? 0,
      limit:
        usageSummary?.storageLimitGB != null ? usageSummary.storageLimitGB * 1024 * 1024 * 1024 : null,
      displayValue:
        usageSummary?.storageLimitGB != null && !isUnlimitedLimit(usageSummary.storageLimitGB)
          ? `${formatBytes(usageSummary.usedHostedStorageBytes ?? 0)} / ${formatBytes(usageSummary.storageLimitGB * 1024 * 1024 * 1024)}`
          : t('pages.billing.unlimited'),
    },
    {
      key: 'processing',
      label: t('pages.billing.usage.processing'),
      used: usageSummary?.usedTransforms ?? 0,
      limit: usageSummary?.transformsLimit ?? null,
      displayValue:
        usageSummary?.transformsLimit != null && !isUnlimitedLimit(usageSummary.transformsLimit)
          ? `${formatNumber(usageSummary.usedTransforms ?? 0)} / ${formatNumber(usageSummary.transformsLimit)}`
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

      <Card>
        <CardHeader className='gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>{t('pages.billing.currentPlan')}</CardTitle>
            <CardDescription>{t('pages.billing.currentPlanDescription')}</CardDescription>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='secondary'>{t(`pages.spaces.plan.${currentPlan}`)}</Badge>
            <Badge variant='outline'>{t(`pages.billing.status.${currentStatus}`)}</Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            {usageItems.map((item) => (
              <div key={item.key} className='space-y-2'>
                <div className='flex items-center justify-between gap-3 text-sm'>
                  <span className='font-medium'>{item.label}</span>
                  <span className='text-muted-foreground'>{item.displayValue}</span>
                </div>
                <Progress value={getProgressValue(item.used, item.limit)} />
              </div>
            ))}
          </div>

          {periodLabel && <p className='text-muted-foreground text-xs'>{periodLabel}</p>}
        </CardContent>
      </Card>

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
                    <span className='font-medium'>{formatNumber(entitlements.transformsLimit)}</span>
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