import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLoaderData, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Mail } from 'lucide-react'

import { acceptInvitation, getGoogleLoginUrl } from '@/api/auth-api'
import { AuthPageShell } from '@/components/auth-page-shell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/stores/auth-store'

const GoogleIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    className='mr-2 h-4 w-4'
    aria-hidden='true'
  >
    <path
      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      fill='#4285F4'
    />
    <path
      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      fill='#34A853'
    />
    <path
      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
      fill='#FBBC05'
    />
    <path
      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      fill='#EA4335'
    />
  </svg>
)

type JoinInviteLoaderResult = {
  invitation: {
    organizationName: string
    spaceName?: string
    invitedEmail: string
    role: string
  } | null
  inviteToken: string
  errorMessage: string | null
  errorReason: string | null
}

export function JoinInvitePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authState, initAuth } = useAuth()
  const { invitation, inviteToken, errorMessage, errorReason } = useLoaderData({ from: '/join' }) as JoinInviteLoaderResult
  const [acceptState, setAcceptState] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [acceptError, setAcceptError] = useState<string | null>(null)

  const resolveRedirectPath = (redirectPath?: string): string => {
    if (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      return redirectPath
    }
    return '/'
  }

  const resolveInviteErrorMessage = (reason: string | null, fallback: string | null): string => {
    switch (reason) {
      case 'invite_email_mismatch':
        return t('pages.joinInvite.errors.emailMismatch')
      case 'invite_org_conflict':
        return t('pages.joinInvite.errors.orgConflict')
      case 'invite_invalid':
      case 'invite_missing_token':
        return t('pages.joinInvite.errors.invalid')
      default:
        return fallback || t('pages.joinInvite.acceptFailed')
    }
  }

  const handleGoogle = () => {
    window.location.href = getGoogleLoginUrl(inviteToken)
  }

  useEffect(() => {
    if (authState.state !== 'authenticated' || !authState.accessToken || !inviteToken || errorMessage) {
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        setAcceptState('loading')
        setAcceptError(null)
        const response = await acceptInvitation(inviteToken, authState.accessToken as string)
        if (cancelled) {
          return
        }
        await initAuth(response.token)
        navigate({ to: resolveRedirectPath(response.redirectPath) })
      } catch (error) {
        if (cancelled) {
          return
        }
        const apiError = error as { reason?: string; message?: string }
        setAcceptState('failed')
        setAcceptError(resolveInviteErrorMessage(apiError.reason || null, error instanceof Error ? error.message : null))
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [authState.accessToken, authState.state, errorMessage, initAuth, inviteToken, navigate, t])

  const authenticatedAcceptanceContent = (
    <div className='bg-muted/50 rounded-2xl border p-4'>
      <p className='text-sm font-semibold'>
        {acceptState === 'failed'
          ? t('pages.joinInvite.acceptFailedTitle')
          : t('pages.joinInvite.acceptingTitle')}
      </p>
      <p className='text-muted-foreground mt-2 text-sm leading-6'>
        {acceptState === 'failed'
          ? acceptError || t('pages.joinInvite.acceptFailed')
          : t('pages.joinInvite.acceptingDescription')}
      </p>
    </div>
  )

  if (authState.isEmbedded) {
    return <Navigate to='/' replace />
  }

  return (
    <AuthPageShell
      eyebrow={t('pages.joinInvite.eyebrow')}
      heroTitle={t('pages.joinInvite.heroTitle')}
      heroBody={
        <p className='text-foreground/85 mt-6 max-w-lg text-sm leading-6 sm:text-base'>
          {t('pages.joinInvite.heroDescription')}
        </p>
      }
      formTitle={t('pages.joinInvite.formTitle')}
      showLegalLinks={authState.multiTenant}
    >
      {authState.state === 'authenticated' ? authenticatedAcceptanceContent : null}

      {invitation ? (
        <div className='bg-muted/50 mb-6 rounded-2xl border p-4'>
          <p className='text-sm font-semibold'>
            {t('pages.joinInvite.invitedTo', { organization: invitation.organizationName })}
          </p>
          <p className='text-muted-foreground mt-2 text-sm leading-6'>
            {invitation.spaceName
              ? t('pages.joinInvite.spaceDescription', {
                  email: invitation.invitedEmail,
                  role: invitation.role,
                  space: invitation.spaceName,
                })
              : t('pages.joinInvite.organizationDescription', {
                  email: invitation.invitedEmail,
                  role: invitation.role,
                })}
          </p>
        </div>
      ) : null}

      {authState.state === 'authenticated' ? null : errorMessage ? (
        <div className='bg-muted/50 rounded-2xl border p-4'>
          <p className='text-sm font-semibold'>{t('pages.joinInvite.invalidTitle')}</p>
          <p className='text-muted-foreground mt-2 text-sm leading-6'>
            {resolveInviteErrorMessage(errorReason, errorMessage)}
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          <Button type='button' className='h-11 w-full text-sm font-medium' onClick={handleGoogle}>
            <GoogleIcon />
            {t('pages.joinInvite.googleAction')}
          </Button>

          <Button asChild type='button' variant='outline' className='h-11 w-full text-sm font-medium'>
            <Link to='/register' search={{ invite_token: inviteToken }}>
              <Mail className='mr-2 h-4 w-4' />
              {t('pages.joinInvite.emailAction')}
            </Link>
          </Button>

          <p className='text-muted-foreground pt-2 text-xs leading-5'>
            {t('pages.joinInvite.secondaryHelp')}
          </p>

          <div className='pt-1'>
            <Link
              to='/login'
              search={{ invite_token: inviteToken }}
              className='text-primary inline-flex items-center text-sm font-medium'
            >
              {t('pages.joinInvite.loginInstead')}
              <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </div>
        </div>
      )}

    </AuthPageShell>
  )
}