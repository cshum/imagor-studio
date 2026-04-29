import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Home } from 'lucide-react'

import {
  resendPublicSignupVerification,
  verifyPublicSignup,
  type AuthApiError,
} from '@/api/auth-api'
import { BrandBar } from '@/components/brand-bar'
import { LanguageSelector } from '@/components/language-selector'
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
  const attemptedTokenRef = useRef<string | null>(null)
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

    if (attemptedTokenRef.current === token) {
      return
    }
    attemptedTokenRef.current = token

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

        if (apiError.status === 409 || apiError.status === 400) {
          const restoredAuth = await initAuth().catch(() => null)
          if (!isCancelled && restoredAuth?.state === 'authenticated' && restoredAuth.accessToken) {
            try {
              await initializeLocale()
            } catch {
              // Ignore locale restoration failures when the session is already valid.
            }
            navigate({ to: '/' })
            return
          }
        }

        setState('error')
        setErrorMessage(apiError.message || t('pages.registerVerify.failed'))
      }
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [navigate])

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

  if (state === 'error') {
    return (
      <div className='bg-background min-h-screen-safe flex flex-col overflow-hidden'>
        <BrandBar
          rightSlot={
            <div className='flex items-center gap-1.5 sm:gap-2'>
              <LicenseBadge />
              <LanguageSelector />
              <ModeToggle />
            </div>
          }
        />

        <div className='flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20'>
          <div className='w-full max-w-2xl'>
            <div className='space-y-6'>
              <div className='bg-red-500/12 text-red-600 flex h-12 w-12 items-center justify-center rounded-full'>
                <AlertTriangle className='h-6 w-6' />
              </div>

              <div className='space-y-3'>
                <p className='text-muted-foreground text-sm font-medium tracking-[0.08em]'>
                  Service error
                </p>
                <h1 className='max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
                  {t('pages.registerVerify.errorTitle')}
                </h1>
                <p className='text-foreground/75 max-w-xl text-base leading-7 sm:text-lg'>
                  {t('pages.registerVerify.errorSubtitle')}
                </p>
              </div>

              {errorMessage ? (
                <div className='border-border/60 bg-muted/30 border px-4 py-3'>
                  <p className='text-foreground text-sm font-medium'>{errorMessage}</p>
                </div>
              ) : null}

              {verificationEmail ? (
                <div className='space-y-3'>
                  <p className='text-foreground/75 max-w-xl text-base leading-7'>
                    {t('pages.registerVerify.resendDescription', { email: verificationEmail })}
                  </p>
                  {resendMessage ? (
                    <div
                      className={
                        resendState === 'error'
                          ? 'bg-destructive/15 text-destructive rounded-md p-3 text-sm'
                          : 'border-border/60 bg-muted/30 text-foreground/80 rounded-md border p-3 text-sm'
                      }
                    >
                      {resendMessage}
                    </div>
                  ) : null}
                  <ButtonWithLoading
                    type='button'
                    variant='outline'
                    className='min-w-56'
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

              <div className='flex flex-wrap gap-3 pt-2'>
                <Button onClick={() => navigate({ to: '/' })} className='h-11 min-w-40'>
                  <Home className='mr-2 h-4 w-4' />
                  {t('common.navigation.home')}
                </Button>
                <Button asChild variant='outline' className='h-11 min-w-40'>
                  <a href='/login'>{t('pages.registerVerify.backToLogin')}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
            <div className='text-muted-foreground rounded-md border p-4 text-sm'>
              {t('pages.registerVerify.verifying')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
