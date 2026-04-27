import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
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
