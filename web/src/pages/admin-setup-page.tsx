import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
import { Button } from '@/components/ui/button'
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
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'

const adminSetupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password must be less than 72 characters'),
})

type AdminSetupForm = z.infer<typeof adminSetupSchema>

// Define system settings for step 2
const SYSTEM_SETTINGS: SystemSetting[] = [
  {
    key: 'config.allow_guest_mode',
    type: 'boolean',
    label: 'Guest Mode',
    description: 'Allow users to browse the gallery without creating an account',
    defaultValue: false,
  },
]

export function AdminSetupPage() {
  const [currentStep, setCurrentStep] = useState<'user' | 'settings'>('user')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { authState } = useAuth()

  const form = useForm<AdminSetupForm>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmitUserForm = async (values: AdminSetupForm) => {
    setIsLoading(true)
    setError(null)

    try {
      // Auto-generate display name from email (part before @)
      const displayName = values.email.split('@')[0]

      const response = await registerAdmin({
        displayName,
        email: values.email,
        password: values.password,
      })

      // Initialize auth with the new token
      await initAuth(response.token)

      // Move to step 2 (system settings)
      setCurrentStep('settings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account')
    } finally {
      setIsLoading(false)
    }
  }

  const onSystemSettingsComplete = () => {
    // Navigate to main app after system settings are configured
    navigate({ to: '/' })
  }

  const skipSystemSettings = () => {
    // Allow user to skip system settings and go directly to main app
    navigate({ to: '/' })
  }

  if (!authState.isFirstRun) {
    return <Navigate to='/' replace />
  }

  if (currentStep === 'settings') {
    return (
      <div className='bg-background flex min-h-screen items-center justify-center p-4'>
        <div className='w-full max-w-2xl space-y-6'>
          <Card>
            <CardHeader className='text-center'>
              <CardTitle className='text-2xl font-bold'>System Configuration</CardTitle>
              <CardDescription>
                Configure your system settings. You can change these later in the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemSettingsForm
                title=""
                description=""
                settings={SYSTEM_SETTINGS}
                initialValues={{}}
                systemRegistryList={[]}
                onSuccess={onSystemSettingsComplete}
                showCard={false}
              />
              
              <div className='flex justify-between pt-4 border-t mt-6'>
                <Button variant='outline' onClick={skipSystemSettings}>
                  Skip for Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
            <form onSubmit={form.handleSubmit(onSubmitUserForm)} className='space-y-4'>
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
