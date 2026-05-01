import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import { isUnlimitedLimit } from '@/lib/plan-entitlements'
import type { OrgOverviewLoaderData } from '@/loaders/account-loader'

interface AccountOrganizationOverviewRoutePageProps {
  loaderData: OrgOverviewLoaderData
}

function formatUsagePeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}

export function AccountOrganizationOverviewRoutePage({
  loaderData,
}: AccountOrganizationOverviewRoutePageProps) {
  const { t } = useTranslation()

  const organization = loaderData.organization
  const usageSummary = loaderData.usageSummary
  const currentPlan = organization?.plan ?? 'free'
  const currentStatus = organization?.planStatus ?? 'canceled'
  const periodLabel = formatUsagePeriod(usageSummary?.periodStart, usageSummary?.periodEnd)
  const memberManagementAvailable = currentStatus !== 'canceled'
  const usedSpaces = usageSummary?.usedSpaces ?? 0
  const maxSpaces = usageSummary?.maxSpaces ?? null
  const spacesOverLimit = maxSpaces != null && !isUnlimitedLimit(maxSpaces) && usedSpaces > maxSpaces
  const storageLimitGB = usageSummary?.storageLimitGB ?? null
  const usedHostedStorageBytes = usageSummary?.usedHostedStorageBytes ?? 0
  const storageOverLimit =
    storageLimitGB != null &&
    !isUnlimitedLimit(storageLimitGB) &&
    usedHostedStorageBytes > storageLimitGB * 1024 * 1024 * 1024
  const transformsLimit = usageSummary?.transformsLimit ?? null
  const usedTransforms = usageSummary?.usedTransforms ?? 0
  const processingOverLimit =
    transformsLimit != null && !isUnlimitedLimit(transformsLimit) && usedTransforms > transformsLimit
  const hasAnyOverLimit = spacesOverLimit || storageOverLimit || processingOverLimit
  const overLimitMessages = [
    spacesOverLimit ? t('pages.organizationOverview.overLimit.messages.spaces') : null,
    storageOverLimit ? t('pages.organizationOverview.overLimit.messages.storage') : null,
    processingOverLimit ? t('pages.organizationOverview.overLimit.messages.processing') : null,
  ].filter((message): message is string => message !== null)

  return (
    <div className='space-y-8'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('pages.organizationOverview.title')}
          </h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('pages.organizationOverview.titleDescription')}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link to='/account/organization/billing'>
              {t('pages.organizationOverview.actions.reviewBilling')}
            </Link>
          </Button>
          {memberManagementAvailable && (
            <Button asChild>
              <Link to='/account/organization/members'>
                {t('pages.organizationOverview.actions.manageMembers')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {hasAnyOverLimit && (
        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-50'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='space-y-2'>
              <p className='text-sm font-semibold'>{t('pages.organizationOverview.overLimit.title')}</p>
              <p className='text-sm'>{t('pages.organizationOverview.overLimit.description')}</p>
              <div className='space-y-1 text-sm'>
                {overLimitMessages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </div>

            <Button asChild className='w-full shrink-0 sm:w-auto'>
              <Link to='/account/organization/billing'>
                {t('pages.organizationOverview.actions.reviewBilling')}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <SettingsSection
        title={organization?.name ?? t('navigation.breadcrumbs.organization')}
        description={t('pages.organizationOverview.summaryDescription')}
        contentClassName='border-t-0'
      >
        <SettingRow
          label={t('pages.organizationOverview.summaryCards.planLabel')}
          description={t('pages.organizationOverview.summaryCards.planDescription')}
        >
          <div className='flex flex-wrap justify-start gap-2 sm:justify-end'>
            <Badge variant='secondary'>{t(`pages.spaces.plan.${currentPlan}`)}</Badge>
          </div>
        </SettingRow>

        <SettingRow
          label={t('pages.organizationOverview.summaryCards.statusLabel')}
          description={t('pages.organizationOverview.summaryCards.statusDescription')}
        >
          <div className='flex flex-wrap justify-start gap-2 sm:justify-end'>
            <Badge variant='outline'>{t(`pages.billing.status.${currentStatus}`)}</Badge>
          </div>
        </SettingRow>

        <SettingRow
          label={t('pages.organizationOverview.summaryCards.organizationLabel')}
          description={t('pages.organizationOverview.summaryCards.organizationDescription')}
        >
          <div className='text-sm font-medium sm:text-right'>{organization?.name ?? '—'}</div>
        </SettingRow>

        <SettingRow
          label={t('pages.organizationOverview.summaryCards.billingPeriodLabel')}
          description={t('pages.organizationOverview.summaryCards.billingPeriodDescription')}
          last
        >
          <div className='text-sm font-medium sm:text-right'>
            {periodLabel ?? t('pages.organizationOverview.notAvailable')}
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  )
}
