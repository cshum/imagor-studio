import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { login } from '@/api/auth-api'
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

const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { authState } = useAuth()
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // If already authenticated or guest, redirect to gallery
  if (authState.state === 'authenticated' || authState.state === 'guest') {
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
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Login failed',
      })
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center'>
          <CardTitle className='text-2xl font-semibold tracking-tight'>Welcome back</CardTitle>
          <CardDescription className='text-muted-foreground'>
            Enter your credentials to access Imagor Studio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='Enter your email'
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='Enter your password'
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive'>
                  {form.formState.errors.root.message}
                </div>
              )}
              <ButtonWithLoading
                type='submit'
                className='w-full'
                isLoading={form.formState.isSubmitting}
              >
                Sign In
              </ButtonWithLoading>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
