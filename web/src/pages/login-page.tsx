import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate, useSearch } from '@tanstack/react-router'
import { z } from 'zod'

import { login } from '@/api/auth-api'
import { LicenseBadge } from '@/components/license-badge'
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

type LoginFormValues = {
  username: string
  password: string
}

export function LoginPage() {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })

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

      // Handle redirect after successful login
      const redirectParam = search.redirect as string | undefined
      if (redirectParam && isValidRedirectUrl(redirectParam)) {
        navigate({ to: redirectParam })
        return
      }

      // Default redirect to home if no valid redirect parameter
      navigate({ to: '/' })
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('auth.login.loginFailed'),
      })
    }
  }

  return (
    <div className='min-h-screen-safe flex items-start justify-center pt-8 md:items-center md:pt-0'>
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
        </CardContent>
      </Card>
    </div>
  )
}
