import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface TrialSummaryCalloutProps {
  daysRemaining?: number | null
  canManageOrganization: boolean
  className?: string
}

export function TrialSummaryCallout({
  daysRemaining = null,
  canManageOrganization,
  className,
}: TrialSummaryCalloutProps) {
  const { t } = useTranslation()
  const hasDaysRemaining = daysRemaining != null && daysRemaining >= 0

  return (
    <div
      className={cn(
        'rounded-md border border-sky-500/20 bg-sky-500/10 p-3 text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-50',
        className,
      )}
    >
      <div className='space-y-1.5'>
        <p className='text-sm font-semibold'>
          {hasDaysRemaining
            ? t('common.trialSummary.daysRemaining', { count: daysRemaining })
            : t('common.trialSummary.title')}
        </p>

        <p className='text-sm text-sky-900/80 dark:text-sky-50/80'>
          {t(
            canManageOrganization
              ? 'common.trialSummary.manageDescription'
              : 'common.trialSummary.memberDescription',
          )}
        </p>
      </div>
    </div>
  )
}
