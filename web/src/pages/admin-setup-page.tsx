import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
import { setSystemRegistryObject } from '@/api/registry-api'
import { StorageConfigurationWizard } from '@/components/storage/storage-configuration-wizard'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MultiStepForm, type MultiStepFormStep } from '@/components/ui/multi-step-form'
import { initAuth, useAuth } from '@/stores/auth-store'

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
  const [settingsFormValues] = useState<Record<string, string>>({})
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

  const handleSystemSettingsNext = async (): Promise<boolean> => {
    try {
      // Save any changed settings
      const changedValues: Record<string, string> = {}
      SYSTEM_SETTINGS.forEach((setting) => {
        const currentValue = settingsFormValues[setting.key]
        const defaultValue = setting.defaultValue.toString()
        if (currentValue && currentValue !== defaultValue) {
          changedValues[setting.key] = currentValue
        }
      })

      if (Object.keys(changedValues).length > 0) {
        await setSystemRegistryObject(changedValues)
      }

      return true
    } catch {
      toast.error('Failed to save settings')
      return false
    }
  }

  const handleSkipSettings = () => {
    return true
  }

  const handleStorageConfigured = (restartRequired: boolean) => {
    if (restartRequired) {
      toast.success('Storage configured successfully! Please restart the server to apply changes.')
    } else {
      toast.success('Storage configured successfully!')
    }
    navigate({ to: '/' })
  }

  const handleSkipStorage = () => {
    toast.success('Welcome to Imagor Studio! You can configure storage later in the admin panel.')
    navigate({ to: '/' })
    return true
  }

  if (!authState.isFirstRun) {
    return <Navigate to='/' replace />
  }

  const steps: MultiStepFormStep[] = [
    {
      id: 'account',
      title: 'Create Admin Account',
      content: (
        <div className='space-y-6'>
          <Form {...form}>
            <div className='space-y-4'>
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
      content: (
        <div className='space-y-6'>
          <SystemSettingsForm
            title=''
            description='These settings can be changed later in the admin panel.'
            settings={SYSTEM_SETTINGS}
            initialValues={{}}
            systemRegistryList={[]}
            hideUpdateButton={true}
            showCard={false}
          />
        </div>
      ),
      onNext: handleSystemSettingsNext,
      onSkip: handleSkipSettings,
      canSkip: true,
      skipLabel: 'Skip for Now',
      nextLabel: 'Next',
      hideBack: true,
    },
    {
      id: 'storage',
      title: 'Storage Configuration',
      content: (
        <div className='space-y-6'>
          <div className='space-y-2 text-center'>
            <p className='text-muted-foreground'>
              Configure where your images will be stored. You can skip this step and configure
              storage later.
            </p>
          </div>
          <StorageConfigurationWizard
            title=''
            description=''
            onSuccess={handleStorageConfigured}
            showCancel={false}
          />
        </div>
      ),
      onNext: () => true,
      onSkip: handleSkipStorage,
      canSkip: true,
      skipLabel: 'Skip Storage Setup',
      nextLabel: 'Complete Setup',
      hideBack: true,
    },
  ]

  return (
    <div className='bg-background flex min-h-screen items-center justify-center p-4'>
      <MultiStepForm
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={() => navigate({ to: '/' })}
        title='Welcome to Imagor Studio'
        description="Let's get your image gallery set up in just a few steps"
        className='w-full max-w-2xl'
      />
    </div>
  )
}
