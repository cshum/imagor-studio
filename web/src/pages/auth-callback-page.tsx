import { useTranslation } from 'react-i18next'

import { BrandBar } from '@/components/brand-bar'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Rendered only when OAuth authentication fails.
 * On success, authCallbackLoader throws a redirect before this ever mounts.
 * Reads ?error= and ?token= directly from the URL.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation()
  const params = new URLSearchParams(window.location.search)
  const errorParam = params.get('error')

  const title = t('pages.authCallback.title')
  const message = errorParam
    ? t('pages.authCallback.errorOAuth', { error: errorParam.replace(/_/g, ' ') })
    : !params.get('token')
      ? t('pages.authCallback.errorNoToken')
      : t('pages.authCallback.failed')

  return (
    <div className='min-h-screen-safe flex flex-col'>
      <BrandBar rightSlot={<ModeToggle />} />

      <div className='relative flex flex-1 items-start justify-center py-6 md:items-center'>
        <LicenseBadge />
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-1 text-center'>
            <CardTitle className='text-2xl font-semibold tracking-tight'>{title}</CardTitle>
            <CardDescription className='text-muted-foreground'>
              {t('pages.authCallback.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='bg-destructive/15 text-destructive rounded-md p-3 text-sm'>
              {message}
            </div>
            <Button asChild className='w-full'>
              <a href='/login'>{t('pages.authCallback.backToLogin')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
