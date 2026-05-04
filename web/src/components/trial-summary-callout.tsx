import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface TrialSummaryCalloutProps {
  daysRemaining?: number | null
  className?: string
}

export function TrialSummaryCallout({ daysRemaining = null, className }: TrialSummaryCalloutProps) {
  const { t } = useTranslation()
  const hasDaysRemaining = daysRemaining != null && daysRemaining >= 0

  return (
    <div
      className={cn(
        'bg-muted/50 text-muted-foreground inline-flex w-fit items-center rounded-full border px-2.5 py-1',
        className,
      )}
    >
      <p className='text-xs font-medium whitespace-nowrap'>
        {hasDaysRemaining
          ? t('common.trialSummary.daysRemaining', { count: daysRemaining })
          : t('common.trialSummary.title')}
      </p>
    </div>
  )
}
