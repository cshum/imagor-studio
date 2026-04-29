import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Home, LoaderCircle } from 'lucide-react'

import { resendPublicSignupVerification, type AuthApiError } from '@/api/auth-api'
import { BrandBar } from '@/components/brand-bar'
import { LanguageSelector } from '@/components/language-selector'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import type { RegisterVerifyLoaderData } from '@/loaders/register-verify-loader'

function RegisterVerifyLayout({
  eyebrow,
  title,
  description,
  icon,
  iconBackgroundClassName,
  body,
}: {
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
  iconBackgroundClassName: string
  body: ReactNode
}) {
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
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBackgroundClassName}`}
            >
              {icon}
            </div>

            <div className='space-y-3'>
              <p className='text-muted-foreground text-sm font-medium tracking-[0.08em]'>
                {eyebrow}
              </p>
              <h1 className='max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
                {title}
              </h1>
              <p className='text-foreground/75 max-w-xl text-base leading-7 sm:text-lg'>
                {description}
              </p>
            </div>

            {body}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RegisterVerifyPendingPage() {
  const { t } = useTranslation()

  return (
    <RegisterVerifyLayout
      eyebrow='Account confirmation'
      title={t('pages.registerVerify.title')}
      description={t('pages.registerVerify.subtitle')}
      icon={<LoaderCircle className='h-6 w-6 animate-spin' />}
      iconBackgroundClassName='bg-muted text-foreground'
      body={
        <div className='border-border/60 bg-muted/30 rounded-md border px-4 py-3'>
          <p className='text-foreground text-sm font-medium'>
            {t('pages.registerVerify.verifying')}
          </p>
        </div>
      }
    />
  )
}

export function RegisterVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { errorMessage, verificationEmail } = useLoaderData({
    from: '/register/verify',
  }) as RegisterVerifyLoaderData
  const [resendCooldownRemaining, setResendCooldownRemaining] = useState(0)
  const [resendState, setResendState] = useState<'idle' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const navigateHome = async () => {
    await navigate({ to: '/' })
  }

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
    <RegisterVerifyLayout
      eyebrow='Service error'
      title={t('pages.registerVerify.errorTitle')}
      description={t('pages.registerVerify.errorSubtitle')}
      icon={<AlertTriangle className='h-6 w-6 text-red-600' />}
      iconBackgroundClassName='bg-red-500/12'
      body={
        <>
          <div className='border-border/60 bg-muted/30 border px-4 py-3'>
            <p className='text-foreground text-sm font-medium'>{errorMessage}</p>
          </div>

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
            <Button onClick={() => void navigateHome()} className='h-11 min-w-40'>
              <Home className='mr-2 h-4 w-4' />
              {t('common.navigation.home')}
            </Button>
            <Button asChild variant='outline' className='h-11 min-w-40'>
              <a href='/login'>{t('pages.registerVerify.backToLogin')}</a>
            </Button>
          </div>
        </>
      }
    />
  )
}
