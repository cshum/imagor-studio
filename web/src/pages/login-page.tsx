import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate, useSearch } from '@tanstack/react-router'
import { z } from 'zod'

import { getAuthProviders, getGoogleLoginUrl, login } from '@/api/auth-api'
import { BrandBar } from '@/components/brand-bar'
import { LicenseBadge } from '@/components/license/license-badge.tsx'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { initAuth, useAuth } from '@/stores/auth-store'
import { initializeLocale } from '@/stores/locale-store'

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

export function LoginPage() {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })
  const [googleEnabled, setGoogleEnabled] = useState(false)

  // Helper function to validate redirect URL for security
  const isValidRedirectUrl = (url: string): boolean => {
    // Only allow relative URLs that start with /
    // This prevents open redirect vulnerabilities
    return url.startsWith('/') && !url.startsWith('//')
  }

  // Create translation-aware validation schema
  const loginSchema = z.object({
    username: z
      .string()
      .min(3, t('auth.validation.usernameMinLength'))
      .max(30, t('auth.validation.usernameMaxLength')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  })

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  useEffect(() => {
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
  if (authState.state === 'authenticated') {
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
    try {
      const response = await login(values)
      await initAuth(response.token)

      // Reload user's language preference after login
      await initializeLocale()

      // Handle redirect after successful login
      const redirectParam = search.redirect as string | undefined
      if (redirectParam && isValidRedirectUrl(redirectParam)) {
        navigate({ to: redirectParam })
        return
      }

      // Default redirect to home if no valid redirect parameter
      navigate({ to: '/' })
    } catch (err) {
      // Map specific error messages to translations
      let errorMessage = t('auth.login.loginFailed') // Default fallback

      if (err instanceof Error) {
        // Check if this is a login credential error
        if (err.message === 'LOGIN_FAILED') {
          errorMessage = t('auth.login.loginFailed')
        } else {
          // For system errors, show the technical message
          errorMessage = err.message
        }
      }

      form.setError('root', {
        message: errorMessage,
      })
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl()
  }

  return (
    <div className='min-h-screen-safe flex flex-col'>
      <BrandBar rightSlot={<ModeToggle />} />

      {/* Content */}
      <div className='relative flex flex-1 items-start justify-center py-6 md:items-center'>
        <LicenseBadge />
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-1 text-center'>
            <CardTitle className='text-2xl font-semibold tracking-tight'>
              {t('auth.login.title')}
            </CardTitle>
            <CardDescription className='text-muted-foreground'>
              {t('auth.login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                <FormField
                  control={form.control}
                  name='username'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.labels.username')}</FormLabel>
                      <FormControl>
                        <Input
                          type='text'
                          placeholder={t('forms.placeholders.enterUsername')}
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
                  <div className='bg-destructive/15 text-destructive rounded-md p-3 text-sm'>
                    {form.formState.errors.root.message}
                  </div>
                )}
                <ButtonWithLoading
                  type='submit'
                  className='w-full'
                  isLoading={form.formState.isSubmitting}
                >
                  {t('auth.login.signIn')}
                </ButtonWithLoading>
              </form>
            </Form>

            {googleEnabled && (
              <>
                <div className='relative my-4'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='border-border w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-card text-muted-foreground px-2'>or</span>
                  </div>
                </div>

                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
