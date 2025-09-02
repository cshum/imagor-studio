import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
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
import { MultiStepForm, type MultiStepFormStep } from '@/components/ui/multi-step-form'
import { CheckCircle } from 'lucide-react'

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
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [systemSettingsChanged, setSystemSettingsChanged] = useState(false)
  const navigate = useNavigate()
  const { authState } = useAuth()

  const form = useForm<AdminSetupForm>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const isFormValid = form.formState.isValid && !form.formState.isSubmitting

  const handleCreateAccount = async (): Promise<boolean> => {
    setError(null)
    
    const values = form.getValues()
    const isValid = await form.trigger()
    
    if (!isValid) {
      return false
    }

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
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account')
      return false
    }
  }

  const handleSystemSettingsNext = (): boolean => {
    // Always allow proceeding from system settings
    return true
  }

  const handleComplete = () => {
    navigate({ to: '/' })
  }

  const handleSkipSettings = () => {
    navigate({ to: '/' })
  }

  if (!authState.isFirstRun) {
    return <Navigate to='/' replace />
  }

  const steps: MultiStepFormStep[] = [
    {
      id: 'account',
      title: 'Create Admin Account',
      description: 'Set up your administrator credentials',
      content: (
        <div className="space-y-6">
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='Enter your email address'
                        {...field}
                        disabled={form.formState.isSubmitting}
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
                        placeholder='Enter a secure password (min. 8 characters)'
                        {...field}
                        disabled={form.formState.isSubmitting}
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
            </div>
          </Form>
        </div>
      ),
      onNext: handleCreateAccount,
      isValid: isFormValid,
      nextLabel: 'Create Account',
      hideBack: true,
    },
    {
      id: 'settings',
      title: 'System Configuration',
      description: 'Configure your system preferences',
      content: (
        <div className="space-y-6">
          <SystemSettingsForm
            title=""
            description="These settings can be changed later in the admin panel."
            settings={SYSTEM_SETTINGS}
            initialValues={{}}
            systemRegistryList={[]}
            onSuccess={() => setSystemSettingsChanged(true)}
            showCard={false}
          />
        </div>
      ),
      onNext: handleSystemSettingsNext,
      onSkip: handleSkipSettings,
      canSkip: true,
      skipLabel: 'Skip for Now',
      nextLabel: 'Save & Continue',
    },
    {
      id: 'complete',
      title: 'Setup Complete',
      description: 'Your Imagor Studio is ready to use',
      content: (
        <div className="text-center space-y-6 py-8">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Welcome to Imagor Studio!</h3>
            <p className="text-muted-foreground">
              Your admin account has been created and the system is configured.
              {systemSettingsChanged && ' Your system settings have been saved.'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>You can access the admin panel anytime to manage users, configure settings, and monitor your image gallery.</p>
          </div>
        </div>
      ),
      nextLabel: 'Enter Imagor Studio',
      hideBack: true,
    },
  ]

  return (
    <div className='bg-background min-h-screen flex items-center justify-center p-4'>
      <MultiStepForm
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={handleComplete}
        title="Welcome to Imagor Studio"
        description="Let's get your image gallery set up in just a few steps"
        className="w-full max-w-2xl"
      />
    </div>
  )
}
