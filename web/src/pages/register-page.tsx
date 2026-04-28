import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { type AuthApiError, getAuthProviders, getGoogleLoginUrl, register } from '@/api/auth-api'
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
import { isValidEmail } from '@/lib/email'
import { initAuth, useAuth } from '@/stores/auth-store'
import { initializeLocale } from '@/stores/locale-store'

type RegisterFormValues = {
  displayName: string
  email: string
  username: string
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

const usernamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/

export function RegisterPage() {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const navigate = useNavigate()
  const [googleEnabled, setGoogleEnabled] = useState(false)
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
      username: z
        .string()
        .trim()
        .min(3, t('forms.validation.usernameMinLength'))
        .max(30, t('forms.validation.usernameMaxLength'))
        .regex(usernamePattern, t('forms.validation.usernamePattern')),
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
      username: '',
      password: '',
      confirmPassword: '',
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

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await register({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
      })

      await initAuth(response.token)
      await initializeLocale()
      navigate({ to: '/' })
    } catch (error) {
      const apiError = error as AuthApiError

      if (apiError.field === 'displayName' || apiError.field === 'email' || apiError.field === 'username' || apiError.field === 'password') {
        form.setError(apiError.field, { message: apiError.message })
        return
      }

      form.setError('root', {
        message: apiError.message || t('auth.register.failed'),
      })
    }
  }

  const handleGoogleSignup = () => {
    window.location.href = getGoogleLoginUrl()
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
    >
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.admin.username')}</FormLabel>
                <FormControl>
                  <Input
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
            <div className='bg-destructive/15 text-destructive rounded-md p-3 text-sm'>
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

      <p className='text-muted-foreground text-center text-sm'>
        {t('auth.register.signInPrompt')}{' '}
        <Link to='/login' className='text-foreground font-medium underline underline-offset-4'>
          {t('auth.register.signInLink')}
        </Link>
      </p>
    </AuthPageShell>
  )
}