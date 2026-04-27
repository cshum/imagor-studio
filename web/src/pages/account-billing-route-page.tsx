import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { createBillingPortalSession, createCheckoutSession } from '@/api/org-api'
import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
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
        usageSummary?.storageLimitGB != null
          ? usageSummary.storageLimitGB * 1024 * 1024 * 1024
          : null,
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

      <SettingsSection
        title={t('pages.organizationOverview.usageTitle')}
        description={t('pages.organizationOverview.usageDescription')}
        contentClassName='border-t-0'
      >
        {usageItems.map((item, index) => (
          <SettingRow
            key={item.key}
            label={item.label}
            description={t('pages.organizationOverview.usage.periodScoped')}
            contentClassName='sm:max-w-md'
            last={index === usageItems.length - 1}
          >
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 text-sm'>
                <span className='text-muted-foreground'>{item.displayValue}</span>
              </div>
              <Progress value={getProgressValue(item.used, item.limit)} />
            </div>
          </SettingRow>
        ))}
      </SettingsSection>

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
