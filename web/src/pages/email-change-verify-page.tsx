import { useTranslation } from 'react-i18next'
import { useLoaderData } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { EmailChangeVerifyLoaderData } from '@/loaders/email-change-verify-loader'
import { RegisterVerifyLayout } from '@/pages/register-verify-page'

export function EmailChangeVerifyPendingPage() {
  const { t } = useTranslation()

  return (
    <RegisterVerifyLayout
      eyebrow={t('pages.emailChangeVerify.pendingEyebrow')}
      title={t('pages.emailChangeVerify.pendingTitle')}
      description={t('pages.emailChangeVerify.pendingDescription')}
      icon={<LoaderCircle className='h-6 w-6 animate-spin' />}
      iconBackgroundClassName='bg-muted text-foreground'
      body={
        <div className='border-border/60 bg-muted/30 rounded-md border px-4 py-3'>
          <p className='text-foreground text-sm font-medium'>
            {t('pages.emailChangeVerify.verifying')}
          </p>
        </div>
      }
    />
  )
}

export function EmailChangeVerifyPage() {
  const { t } = useTranslation()
  const { status, errorMessage, verifiedEmail, isAuthenticated } = useLoaderData({
    from: '/account/email/verify',
  }) as EmailChangeVerifyLoaderData

  if (status === 'success') {
    return (
      <RegisterVerifyLayout
        eyebrow={t('pages.emailChangeVerify.successEyebrow')}
        title={t('pages.emailChangeVerify.successTitle')}
        description={t('pages.emailChangeVerify.successDescription', { email: verifiedEmail })}
        icon={<CheckCircle2 className='h-6 w-6 text-emerald-600' />}
        iconBackgroundClassName='bg-emerald-500/12'
        body={
          <div className='space-y-4'>
            <div className='border-border/60 bg-muted/30 rounded-md border px-4 py-3'>
              <p className='text-foreground text-sm font-medium'>
                {t('pages.emailChangeVerify.successBody', { email: verifiedEmail })}
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Button asChild className='h-11 px-4'>
                <a href={isAuthenticated ? '/account/profile' : '/login'}>
                  {isAuthenticated
                    ? t('pages.emailChangeVerify.backToProfile')
                    : t('pages.emailChangeVerify.backToLogin')}
                </a>
              </Button>
            </div>
          </div>
        }
      />
    )
  }

  return (
    <RegisterVerifyLayout
      eyebrow={t('pages.emailChangeVerify.errorEyebrow')}
      title={t('pages.emailChangeVerify.errorTitle')}
      description={t('pages.emailChangeVerify.errorSubtitle')}
      icon={<AlertTriangle className='h-6 w-6 text-red-600' />}
      iconBackgroundClassName='bg-red-500/12'
      body={
        <div className='space-y-4'>
          <p className='text-foreground text-sm font-medium'>{errorMessage}</p>
          <p className='text-foreground/75 max-w-xl text-base leading-7'>
            {t('pages.emailChangeVerify.errorHelp')}
          </p>

          <div className='flex flex-wrap items-center gap-2 pt-1'>
            <Button asChild className='h-11 px-4'>
              <a href={isAuthenticated ? '/account/profile' : '/login'}>
                {isAuthenticated
                  ? t('pages.emailChangeVerify.backToProfile')
                  : t('pages.emailChangeVerify.backToLogin')}
              </a>
            </Button>
          </div>
        </div>
      }
    />
  )
}
