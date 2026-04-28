import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'

import {
  resendPublicSignupVerification,
  verifyPublicSignup,
  type AuthApiError,
} from '@/api/auth-api'
import { BrandBar } from '@/components/brand-bar'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { initAuth } from '@/stores/auth-store'
import { initializeLocale } from '@/stores/locale-store'

type VerificationState = 'verifying' | 'error'

export function RegisterVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [state, setState] = useState<VerificationState>('verifying')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [resendCooldownRemaining, setResendCooldownRemaining] = useState(0)
  const [resendState, setResendState] = useState<'idle' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const token = searchParams.get('token')?.trim()
    const email = searchParams.get('email')?.trim()

    setVerificationEmail(email || null)

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

  useEffect(() => {
    if (resendCooldownRemaining <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setResendCooldownRemaining((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [resendCooldownRemaining])

  const handleResendVerification = async () => {
    if (!verificationEmail || resendCooldownRemaining > 0 || isResending) {
      return
    }

    setIsResending(true)
    setResendState('idle')
    setResendMessage(null)

    try {
      const response = await resendPublicSignupVerification(verificationEmail)
      setResendCooldownRemaining(Math.max(0, response.cooldownSeconds))
      setResendState('success')
      setResendMessage(t('pages.registerVerify.resendSuccess'))
    } catch (error) {
      const apiError = error as AuthApiError
      setResendState('error')
      if (apiError.status === 429) {
        setResendMessage(t('pages.registerVerify.resendCooldown'))
      } else {
        setResendMessage(apiError.message || t('pages.registerVerify.resendFailed'))
      }
    } finally {
      setIsResending(false)
    }
  }

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
                {verificationEmail ? (
                  <div className='space-y-3'>
                    <p className='text-muted-foreground text-sm'>
                      {t('pages.registerVerify.resendDescription', { email: verificationEmail })}
                    </p>
                    {resendMessage ? (
                      <div
                        className={
                          resendState === 'error'
                            ? 'bg-destructive/15 text-destructive rounded-md p-3 text-sm'
                            : 'rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-700'
                        }
                      >
                        {resendMessage}
                      </div>
                    ) : null}
                    <ButtonWithLoading
                      type='button'
                      variant='outline'
                      className='w-full'
                      isLoading={isResending}
                      disabled={isResending || resendCooldownRemaining > 0}
                      onClick={handleResendVerification}
                    >
                      {resendCooldownRemaining > 0
                        ? t('pages.registerVerify.resendCountdown', {
                            seconds: resendCooldownRemaining,
                          })
                        : t('pages.registerVerify.resendAction')}
                    </ButtonWithLoading>
                  </div>
                ) : null}
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
