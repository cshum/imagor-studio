import { useTranslation } from 'react-i18next'
import { LogIn } from 'lucide-react'

import { ErrorPage } from '@/components/ui/error-page'

/**
 * Rendered only when OAuth authentication fails.
 * On success, authCallbackLoader throws a redirect before this ever mounts.
 * Reads ?error= and ?token= directly from the URL.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation()
  const params = new URLSearchParams(window.location.search)
  const errorParam = params.get('error')
  const inviteToken = params.get('invite_token')?.trim()
  const errorMessageKey =
    errorParam === 'invite_org_conflict'
      ? 'pages.authCallback.errors.inviteOrgConflict'
      : errorParam === 'invite_email_mismatch'
        ? 'pages.authCallback.errors.inviteEmailMismatch'
        : null
  const actionHref = inviteToken
    ? `/login?invite_token=${encodeURIComponent(inviteToken)}`
    : '/login'

  const title = t('pages.authCallback.title')
  let message = t('pages.authCallback.failed')

  if (errorParam) {
    message = errorMessageKey
      ? t(errorMessageKey)
      : t('pages.authCallback.errorOAuth', { error: errorParam.replace(/_/g, ' ') })
  } else if (!params.get('token')) {
    message = t('pages.authCallback.errorNoToken')
  }

  return (
    <ErrorPage
      error={message}
      title={title}
      description={t('pages.authCallback.subtitle')}
      actionLabel={t('pages.authCallback.backToLogin')}
      actionHref={actionHref}
      actionIcon={LogIn}
    />
  )
}
