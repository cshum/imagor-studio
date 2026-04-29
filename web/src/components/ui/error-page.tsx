import { useTranslation } from 'react-i18next'
import { AlertTriangle, Home, ShieldAlert, type LucideIcon } from 'lucide-react'

import { BrandBar } from '@/components/brand-bar'
import { LanguageSelector } from '@/components/language-selector'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { extractErrorInfo } from '@/lib/error-utils'

import { Button } from './button'

interface ErrorPageProps {
  error?: Error | string
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  actionIcon?: LucideIcon
}

const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

export function ErrorPage({
  error,
  title,
  description,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon = Home,
}: ErrorPageProps) {
  const { t } = useTranslation()
  const errorInfo = extractErrorInfo(error)
  const isForbidden = errorInfo.code === 'FORBIDDEN'
  const isNotFound = errorInfo.code === 'NOT_FOUND' || /not found/i.test(errorInfo.message)

  const resolvedTitle =
    title ??
    (isForbidden
      ? t('pages.error.forbiddenTitle')
      : isNotFound
        ? t('pages.error.notFoundTitle')
        : t('pages.error.defaultTitle'))
  const resolvedDescription =
    description ??
    (isForbidden
      ? t('pages.error.forbiddenDescription')
      : isNotFound
        ? t('pages.error.notFoundDescription')
        : t('pages.error.defaultDescription'))
  const resolvedActionLabel = actionLabel ?? t('common.navigation.home')
  const shouldShowAction = actionHref ? true : !isEmbeddedMode

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleAction = () => {
    if (actionHref) {
      window.location.href = actionHref
      return
    }

    handleGoHome()
  }

  const errorMessage = typeof error === 'string' ? error : errorInfo.message
  const HeroIcon = isForbidden ? ShieldAlert : AlertTriangle
  const iconClassName = isForbidden ? 'text-amber-700' : 'text-red-600'
  const iconBackgroundClassName = isForbidden
    ? 'bg-amber-500/12 text-amber-700'
    : 'bg-red-500/12 text-red-600'
  const eyebrow = isForbidden
    ? 'Access restricted'
    : isNotFound
      ? 'Page not found'
      : 'Service error'

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
              <HeroIcon className={`h-6 w-6 ${iconClassName}`} />
            </div>

            <div className='space-y-3'>
              <p className='text-muted-foreground text-sm font-medium tracking-[0.08em]'>
                {eyebrow}
              </p>
              <h1 className='max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
                {resolvedTitle}
              </h1>
              <p className='text-foreground/75 max-w-xl text-base leading-7 sm:text-lg'>
                {resolvedDescription}
              </p>
            </div>

            {errorMessage && import.meta.env.DEV ? (
              <div className='border-border/60 bg-muted/30 border px-4 py-3'>
                <p className='text-foreground text-sm font-medium'>Error details</p>
                <p className='text-muted-foreground mt-2 font-mono text-xs leading-6 break-words'>
                  {errorMessage}
                </p>
              </div>
            ) : null}

            {shouldShowAction ? (
              <div className='pt-2'>
                <Button onClick={handleAction} className='h-11 min-w-40'>
                  <ActionIcon className='mr-2 h-4 w-4' />
                  {resolvedActionLabel}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
