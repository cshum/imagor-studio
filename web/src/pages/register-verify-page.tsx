import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'

import { verifyPublicSignup, type AuthApiError } from '@/api/auth-api'
import { BrandBar } from '@/components/brand-bar'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { initAuth } from '@/stores/auth-store'
import { initializeLocale } from '@/stores/locale-store'

type VerificationState = 'verifying' | 'error'

export function RegisterVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [state, setState] = useState<VerificationState>('verifying')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')?.trim()

    if (!token) {
      setState('error')
      setErrorMessage(t('pages.registerVerify.missingToken'))
      return
    }

    let isCancelled = false

    const run = async () => {
      try {
        const response = await verifyPublicSignup(token)
        await initAuth(response.token)
        await initializeLocale()
        if (!isCancelled) {
          navigate({ to: '/' })
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        const apiError = error as AuthApiError
        setState('error')
        setErrorMessage(apiError.message || t('pages.registerVerify.failed'))
      }
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [navigate, t])

  return (
    <div className='min-h-screen-safe flex flex-col'>
      <BrandBar rightSlot={<ModeToggle />} />

      <div className='relative flex flex-1 items-start justify-center py-6 md:items-center'>
        <LicenseBadge />
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-1 text-center'>
            <CardTitle className='text-2xl font-semibold tracking-tight'>
              {state === 'verifying'
                ? t('pages.registerVerify.title')
                : t('pages.registerVerify.errorTitle')}
            </CardTitle>
            <CardDescription className='text-muted-foreground'>
              {state === 'verifying'
                ? t('pages.registerVerify.subtitle')
                : t('pages.registerVerify.errorSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {state === 'verifying' ? (
              <div className='text-muted-foreground rounded-md border p-4 text-sm'>
                {t('pages.registerVerify.verifying')}
              </div>
            ) : (
              <>
                <div className='bg-destructive/15 text-destructive rounded-md p-3 text-sm'>
                  {errorMessage}
                </div>
                <Button asChild className='w-full'>
                  <a href='/login'>{t('pages.registerVerify.backToLogin')}</a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}