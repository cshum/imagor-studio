import { AlertTriangle, Home, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BrandBar } from '@/components/brand-bar'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { extractErrorInfo } from '@/lib/error-utils'
import { getAuth } from '@/stores/auth-store'

import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface ErrorPageProps {
  error?: Error | string
  title?: string
  description?: string
}

const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

export function ErrorPage({
  error,
  title,
  description,
}: ErrorPageProps) {
  const { t } = useTranslation()
  const auth = getAuth()
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
  const actionLabel = auth.multiTenant
    ? t('pages.spaceSettings.backToSpaces')
    : t('common.navigation.home')

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const errorMessage = typeof error === 'string' ? error : errorInfo.message
  const HeroIcon = isForbidden ? ShieldAlert : AlertTriangle
  const iconClassName = isForbidden ? 'text-amber-700' : 'text-red-600'
  const iconBackgroundClassName = isForbidden ? 'bg-amber-100' : 'bg-red-100'
  const titleClassName = isForbidden ? 'text-zinc-950' : 'text-red-900'

  return (
    <div className='min-h-screen-safe flex flex-col'>
      <BrandBar rightSlot={<ModeToggle />} />

      {/* Content */}
      <div className='relative flex flex-1 items-start justify-center bg-zinc-50 px-4 py-6 md:items-center dark:bg-zinc-950'>
        <LicenseBadge />
        <Card className='w-full max-w-xl border-zinc-200 bg-white/95 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95'>
          <CardHeader className='text-center'>
            <div
              className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconBackgroundClassName}`}
            >
              <HeroIcon className={`h-6 w-6 ${iconClassName}`} />
            </div>
            <CardTitle className={titleClassName}>{resolvedTitle}</CardTitle>
            <CardDescription className='mx-auto max-w-md text-sm text-zinc-600 dark:text-zinc-300'>
              {resolvedDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {errorMessage && import.meta.env.DEV && (
              <div className='rounded-md bg-red-50 p-3'>
                <p className='text-sm font-medium text-red-800'>Error Details:</p>
                <p className='mt-1 font-mono text-xs text-red-700'>{errorMessage}</p>
              </div>
            )}
            {!isEmbeddedMode && (
              <Button onClick={handleGoHome} className='w-full'>
                <Home className='mr-2 h-4 w-4' />
                {actionLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
