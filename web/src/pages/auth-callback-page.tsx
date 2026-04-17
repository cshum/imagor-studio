import { useTranslation } from 'react-i18next'

/**
 * Rendered only when OAuth authentication fails.
 * On success, authCallbackLoader throws a redirect before this ever mounts.
 * Reads ?error= and ?token= directly from the URL.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation()
  const params = new URLSearchParams(window.location.search)
  const errorParam = params.get('error')

  const message = errorParam
    ? t('pages.authCallback.errorOAuth', { error: errorParam.replace(/_/g, ' ') })
    : !params.get('token')
      ? t('pages.authCallback.errorNoToken')
      : t('pages.authCallback.failed')

  return (
    <div className='min-h-screen-safe flex flex-col items-center justify-center gap-4'>
      <p className='text-destructive text-sm'>{message}</p>
      <a href='/login' className='text-primary text-sm underline'>
        {t('pages.authCallback.backToLogin')}
      </a>
    </div>
  )
}
