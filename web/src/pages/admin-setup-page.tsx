import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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

const adminSetupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password must be less than 72 characters'),
  enableGuestMode: z.boolean(),
})

type AdminSetupForm = z.infer<typeof adminSetupSchema>

export function AdminSetupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { authState } = useAuth()

  const form = useForm<AdminSetupForm>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      email: '',
      password: '',
      enableGuestMode: false,
    },
  })

  const onSubmit = async (values: AdminSetupForm) => {
    setIsLoading(true)
    setError(null)

    try {
      // Auto-generate display name from email (part before @)
      const displayName = values.email.split('@')[0]

      const response = await registerAdmin({
        displayName,
        email: values.email,
        password: values.password,
        enableGuestMode: values.enableGuestMode,
      })

      // Initialize auth with the new token
      await initAuth(response.token)

      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account')
    } finally {
      setIsLoading(false)
    }
  }

  if (!authState.isFirstRun) {
    return <Navigate to='/' replace />
  }

  return (
    <div className='bg-background flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>Welcome to Imagor Studio</CardTitle>
          <CardDescription>
            Set up your admin account to get started. This is a one-time setup for the first user.
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
                        placeholder='Enter your email address'
                        {...field}
                        disabled={isLoading}
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
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='enableGuestMode'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-y-0 space-x-3'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>Enable Guest Mode</FormLabel>
                      <p className='text-muted-foreground text-sm'>
                        Allow users to browse without creating an account
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {error && (
                <div className='text-destructive bg-destructive/10 rounded-md p-3 text-sm'>
                  {error}
                </div>
              )}

              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
