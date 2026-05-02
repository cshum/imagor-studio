import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { z } from 'zod'

import { getAuthProviders, getGoogleLoginUrl, login } from '@/api/auth-api'
import { AuthPageShell } from '@/components/auth-page-shell'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getBootstrappedAuthProviders } from '@/lib/app-bootstrap'
import { isValidEmail } from '@/lib/email'
import { initAuth, useAuth } from '@/stores/auth-store'

type LoginFormValues = {
  username: string
  password: string
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

const usernamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/

export function LoginPage() {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const navigate = useNavigate()
  const router = useRouter()
  const search = useSearch({ from: '/login' })
  const [isCompletingLogin, setIsCompletingLogin] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(
    () => getBootstrappedAuthProviders()?.includes('google') ?? false,
  )
  const isMultiTenant = authState.multiTenant
  const inviteToken = typeof search.invite_token === 'string' ? search.invite_token : undefined

  // Helper function to validate redirect URL for security
  const isValidRedirectUrl = (url: string): boolean => {
    // Only allow relative URLs that start with /
    // This prevents open redirect vulnerabilities
    return url.startsWith('/') && !url.startsWith('//')
  }

  const resolvePostLoginRedirect = (redirectPath?: string): string => {
    if (isMultiTenant) {
      return '/'
    }

    if (redirectPath && isValidRedirectUrl(redirectPath)) {
      return redirectPath
    }
    return '/'
  }

  const identifierRequiredMessage = isMultiTenant
    ? t('auth.validation.identifierRequiredCloud')
    : t('auth.validation.usernameRequired')

  // Create translation-aware validation schema
  const loginSchema = z.object({
    username: z
      .string()
      .trim()
      .superRefine((value, ctx) => {
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: identifierRequiredMessage,
          })
          return
        }

        if (isMultiTenant && value.includes('@')) {
          if (!isValidEmail(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('auth.validation.invalidEmailOrUsername'),
            })
          }
          return
        }

        if (value.length < 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('auth.validation.usernameMinLength'),
          })
        }

        if (value.length > 30) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('auth.validation.usernameMaxLength'),
          })
        }

        if (!usernamePattern.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: isMultiTenant
              ? t('auth.validation.invalidEmailOrUsername')
              : t('auth.validation.invalidUsername'),
          })
        }
      }),
    password: z.string().trim().min(1, t('auth.validation.passwordRequired')),
  })

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
    },
  })

  useEffect(() => {
    if (getBootstrappedAuthProviders() !== null) {
      return
    }

    getAuthProviders()
      .then(({ providers }) => {
        setGoogleEnabled(providers.includes('google'))
      })
      .catch(() => {
        // If providers endpoint fails, just don't show OAuth buttons
      })
  }, [])

  // Redirect embedded guests to homepage to avoid login UI
  if (authState.isEmbedded) {
    return <Navigate to='/' replace />
  }

  // If already authenticated, redirect to intended destination or gallery
  if (authState.state === 'authenticated' && !isCompletingLogin) {
    const redirectParam = search.redirect as string | undefined
    if (redirectParam && isValidRedirectUrl(redirectParam)) {
      return <Navigate to={redirectParam} replace />
    }
    return <Navigate to='/' replace />
  }

  // If first run, redirect to admin setup
  if (authState.isFirstRun) {
    return <Navigate to='/admin-setup' replace />
  }

  const onSubmit = async (values: LoginFormValues) => {
    setIsCompletingLogin(true)

    try {
      const response = await login({
        username: values.username.trim(),
        password: values.password,
        inviteToken,
      })
      await initAuth(response.token)
      await router.invalidate()

      // Handle redirect after successful login
      const redirectParam = search.redirect as string | undefined
      if (redirectParam && isValidRedirectUrl(redirectParam)) {
        navigate({ to: redirectParam })
        return
      }

      navigate({ to: resolvePostLoginRedirect(response.redirectPath) })
    } catch (err) {
      // Map specific error messages to translations
      let errorMessage = t('auth.login.loginFailed') // Default fallback

      if (err instanceof Error) {
        const apiError = err as Error & { reason?: string }

        // Check if this is a login credential error
        if (err.message === 'LOGIN_FAILED') {
          errorMessage = t('auth.login.loginFailed')
        } else if (apiError.reason === 'invite_invalid') {
          errorMessage = t('auth.login.errors.inviteInvalid')
        } else if (apiError.reason === 'invite_org_conflict') {
          errorMessage = t('auth.login.errors.inviteOrgConflict')
        } else if (apiError.reason === 'invite_email_mismatch') {
          errorMessage = t('auth.login.errors.inviteEmailMismatch')
        } else {
          // For system errors, show the technical message
          errorMessage = err.message
        }
      }

      form.setError('root', {
        message: errorMessage,
      })
      setIsCompletingLogin(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl(inviteToken)
  }

  const credentialsDividerKey = isMultiTenant
    ? 'auth.login.credentialsDividerCloud'
    : 'auth.login.credentialsDividerSelfHosted'
  const identifierLabelKey = isMultiTenant
    ? 'auth.login.identifierLabelCloud'
    : 'auth.login.identifierLabelSelfHosted'
  const identifierPlaceholderKey = isMultiTenant
    ? 'auth.login.identifierPlaceholderCloud'
    : 'auth.login.identifierPlaceholderSelfHosted'
  const productHighlights = [
    t('auth.login.highlights.storage'),
    t('auth.login.highlights.delivery'),
    t('auth.login.highlights.access'),
  ]

  return (
    <AuthPageShell
      eyebrow={t('auth.login.eyebrow')}
      heroTitle={t('auth.login.title')}
      showHero={isMultiTenant}
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
      formTitle={t('auth.login.formTitle')}
      showLegalLinks={isMultiTenant}
    >
      {googleEnabled ? (
        <Button
          type='button'
          variant='outline'
          className='h-11 w-full text-sm font-medium'
          onClick={handleGoogleLogin}
        >
          <GoogleIcon />
          {t('auth.login.googleCta')}
        </Button>
      ) : null}

      {googleEnabled ? (
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <span className='border-border w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs font-medium'>
            <span className='bg-background text-muted-foreground px-3'>
              {t(credentialsDividerKey)}
            </span>
          </div>
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(identifierLabelKey)}</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    placeholder={t(identifierPlaceholderKey)}
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
            {t('auth.login.signIn')}
          </ButtonWithLoading>
        </form>
      </Form>

      {isMultiTenant ? (
        <p className='text-muted-foreground text-center text-sm'>
          {t('auth.login.createAccountPrompt')}{' '}
          <Link
            to='/register'
            search={inviteToken ? { invite_token: inviteToken } : undefined}
            className='text-foreground font-medium underline underline-offset-4'
          >
            {t('auth.login.createAccountLink')}
          </Link>
        </p>
      ) : null}
    </AuthPageShell>
  )
}
