import { Trans, useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

interface S3RequirementsNoteProps {
  className?: string
}

export function S3RequirementsNote({ className }: S3RequirementsNoteProps) {
  const { t } = useTranslation()
  const appOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : t('pages.storage.s3Requirements.appOriginFallback')

  return (
    <div
      className={[
        'bg-muted/50 text-muted-foreground rounded-md border px-3 py-3 text-xs',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className='flex items-start gap-2'>
        <Info className='mt-0.5 h-3.5 w-3.5 shrink-0' />
        <div className='space-y-1.5'>
          <p>{t('pages.storage.s3Requirements.permissions')}</p>
          <p>
            <Trans
              i18nKey='pages.storage.s3Requirements.cors'
              values={{ origin: appOrigin }}
              components={{
                1: <strong className='text-foreground font-medium' />,
                2: <strong className='text-foreground font-medium' />,
              }}
            />
          </p>
        </div>
      </div>
    </div>
  )
}
