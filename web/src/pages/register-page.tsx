import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { MailCheck } from 'lucide-react'
import { z } from 'zod'

import {
  getAuthProviders,
  getGoogleLoginUrl,
  registerWithVerificationFallback,
  resendPublicSignupVerification,
  resolveInvitation,
  type AuthApiError,
  type PublicSignupVerificationResponse,
} from '@/api/auth-api'
import { AuthPageShell } from '@/components/auth-page-shell'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { isValidEmail } from '@/lib/email'
import { initAuth, useAuth } from '@/stores/auth-store'
import { initializeLocale } from '@/stores/locale-store'

type RegisterFormValues = {
  displayName: string
  email: string
  password: string
  confirmPassword: string
}

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

export function RegisterPage() {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ from: '/register' })
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [pendingVerification, setPendingVerification] =
    useState<PublicSignupVerificationResponse | null>(null)
  const [resendCooldownRemaining, setResendCooldownRemaining] = useState(0)
  const [resendState, setResendState] = useState<'idle' | 'success' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [lockedInviteEmail, setLockedInviteEmail] = useState<string | null>(null)
  const productHighlights = [
    t('auth.login.highlights.storage'),
    t('auth.login.highlights.delivery'),
    t('auth.login.highlights.access'),
  ]

  const registerSchema = z
    .object({
      displayName: z
        .string()
        .trim()
        .min(3, t('forms.validation.displayNameMinLength'))
        .max(100, t('forms.validation.displayNameMaxLength')),
      email: z.string().trim().refine(isValidEmail, t('pages.profile.invalidEmail')),
      password: z
        .string()
        .min(8, t('forms.validation.passwordMinLength'))
        .max(72, t('forms.validation.passwordMaxLength')),
      confirmPassword: z
        .string()
        .min(8, t('forms.validation.confirmPasswordMinLength'))
        .max(72, t('forms.validation.confirmPasswordMaxLength')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('forms.validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const pendingVerificationDestination = pendingVerification
    ? pendingVerification.maskedDestination?.trim() ||
      pendingVerification.email?.trim() ||
      form.getValues('email').trim()
    : ''
  const inviteToken = typeof search.invite_token === 'string' ? search.invite_token.trim() : ''

  useEffect(() => {
    getAuthProviders()
      .then(({ providers }) => {
        setGoogleEnabled(providers.includes('google'))
      })
      .catch(() => {
        // If providers endpoint fails, just don't show OAuth buttons
      })
  }, [])

  useEffect(() => {
    if (!inviteToken) {
      setLockedInviteEmail(null)
      return
    }

    let cancelled = false

    resolveInvitation(inviteToken)
      .then((invitation) => {
        if (cancelled) {
          return
        }

        const invitedEmail = invitation.invitedEmail.trim()
        setLockedInviteEmail(invitedEmail)
        form.setValue('email', invitedEmail, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        })
        form.clearErrors('email')
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setLockedInviteEmail(null)
      })

    return () => {
      cancelled = true
    }
  }, [form, inviteToken])

  useEffect(() => {
    if (!pendingVerification) {
      setResendCooldownRemaining(0)
      return
    }

    setResendCooldownRemaining(Math.max(0, pendingVerification.cooldownSeconds))
  }, [pendingVerification])

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

  if (authState.isEmbedded) {
    return <Navigate to='/' replace />
  }

  if (authState.isFirstRun) {
    return <Navigate to='/admin-setup' replace />
  }

  if (!authState.multiTenant) {
    return <Navigate to='/login' replace />
  }

  if (authState.state === 'authenticated') {
    return <Navigate to='/' replace />
  }

  const resolveRedirectPath = (redirectPath?: string): string => {
    if (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      return redirectPath
    }
    return '/'
  }

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const result = await registerWithVerificationFallback({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
        inviteToken: inviteToken || undefined,
      })

      if (result.kind === 'verification-required') {
        setPendingVerification(result.response)
        form.reset({
          displayName: values.displayName.trim(),
          email: values.email.trim(),
          password: '',
          confirmPassword: '',
        })
        return
      }

      await initAuth(result.response.token)
  await router.invalidate()
      await initializeLocale()
      navigate({ to: resolveRedirectPath(result.response.redirectPath) })
    } catch (error) {
      const apiError = error as AuthApiError

      if (
        apiError.field === 'displayName' ||
        apiError.field === 'email' ||
        apiError.field === 'password'
      ) {
        form.setError(apiError.field, { message: apiError.message })
        return
      }

      form.setError('root', {
        message: apiError.message || t('auth.register.failed'),
      })
    }
  }

  const handleGoogleSignup = () => {
    window.location.href = getGoogleLoginUrl(inviteToken || undefined)
  }

  const handleResendVerification = async () => {
    if (!pendingVerification || resendCooldownRemaining > 0 || isResending) {
      return
    }

    setIsResending(true)
    setResendState('idle')
    setResendMessage(null)

    try {
      const response = await resendPublicSignupVerification(pendingVerification.email)
      setPendingVerification(response)
      setResendState('success')
      setResendMessage(t('auth.register.resendSuccess'))
    } catch (error) {
      const apiError = error as AuthApiError
      if (apiError.status === 429) {
        setResendState('error')
        setResendMessage(
          t('auth.register.resendCooldown', {
            seconds: resendCooldownRemaining || pendingVerification.cooldownSeconds,
          }),
        )
        return
      }

      setResendState('error')
      setResendMessage(apiError.message || t('auth.register.resendFailed'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthPageShell
      eyebrow={t('auth.login.eyebrow')}
      heroTitle={t('auth.login.title')}
      heroBody={
        <ul className='mt-6 space-y-4'>
          {productHighlights.map((highlight) => (
            <li key={highlight}>
              <p className='text-foreground/90 text-sm leading-6 font-medium sm:text-base'>
                {highlight}
              </p>
            </li>
          ))}
        </ul>
      }
      formTitle={t('auth.register.formTitle')}
      showLegalLinks={authState.multiTenant}
    >
      {pendingVerification ? (
        <div className='border-border/60 bg-muted/20 space-y-5 rounded-2xl border p-6'>
          <div className='space-y-4'>
            <div className='bg-background text-foreground flex h-12 w-12 items-center justify-center rounded-full border'>
              <MailCheck className='h-6 w-6' />
            </div>
            <div className='space-y-2'>
              <p className='text-muted-foreground text-xs font-medium tracking-[0.08em]'>
                {t('auth.register.pendingEyebrow')}
              </p>
              <h2 className='text-foreground text-lg font-semibold'>
                {t('auth.register.pendingTitle')}
              </h2>
              <p className='text-muted-foreground text-sm leading-6'>
                {pendingVerificationDestination
                  ? t('auth.register.pendingDescription', {
                      email: pendingVerificationDestination,
                    })
                  : t('auth.register.pendingDescriptionFallback')}
              </p>
            </div>
          </div>
          {resendMessage ? (
            <div
              className={
                resendState === 'error'
                  ? 'bg-destructive/5 text-destructive rounded-md p-3 text-sm'
                  : 'bg-background text-foreground/80 rounded-md border p-3 text-sm'
              }
            >
              {resendMessage}
            </div>
          ) : null}
          <div className='space-y-2 pt-1'>
            <ButtonWithLoading
              type='button'
              className='w-full'
              isLoading={isResending}
              disabled={isResending || resendCooldownRemaining > 0}
              onClick={handleResendVerification}
            >
              {resendCooldownRemaining > 0
                ? t('auth.register.resendCountdown', { seconds: resendCooldownRemaining })
                : t('auth.register.resendAction')}
            </ButtonWithLoading>
            <Button
              type='button'
              variant='ghost'
              className='w-full'
              onClick={() => {
                setPendingVerification(null)
                setResendState('idle')
                setResendMessage(null)
              }}
            >
              {t('auth.register.useDifferentEmail')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {googleEnabled ? (
            <Button
              type='button'
              variant='outline'
              className='h-11 w-full text-sm font-medium'
              onClick={handleGoogleSignup}
            >
              <GoogleIcon />
              {t('auth.register.googleCta')}
            </Button>
          ) : null}

          {googleEnabled ? (
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <span className='border-border w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs font-medium'>
                <span className='bg-background text-muted-foreground px-3'>
                  {t('auth.register.credentialsDivider')}
                </span>
              </div>
            </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='displayName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.profile.displayName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('pages.profile.displayNamePlaceholder')}
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.profile.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder={t('auth.register.emailPlaceholder')}
                        disabled={form.formState.isSubmitting}
                        readOnly={Boolean(lockedInviteEmail)}
                        {...field}
                      />
                    </FormControl>
                    {lockedInviteEmail ? (
                      <FormDescription>
                        {t('auth.register.invitedEmailHint', { email: lockedInviteEmail })}
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('forms.placeholders.enterPassword')}
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.admin.confirmPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('forms.placeholders.confirmPassword')}
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <div className='bg-destructive/5 text-destructive rounded-md p-3 text-sm'>
                  {form.formState.errors.root.message}
                </div>
              )}
              <ButtonWithLoading
                type='submit'
                className='h-11 w-full'
                isLoading={form.formState.isSubmitting}
              >
                {t('auth.register.submit')}
              </ButtonWithLoading>
            </form>
          </Form>
        </>
      )}

      <p className='text-muted-foreground text-center text-sm'>
        {t('auth.register.signInPrompt')}{' '}
        <Link to='/login' className='text-foreground font-medium underline underline-offset-4'>
          {t('auth.register.signInLink')}
        </Link>
      </p>
    </AuthPageShell>
  )
}
