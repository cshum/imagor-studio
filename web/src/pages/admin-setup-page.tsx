import { useEffect, useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
import { setSystemRegistryObject } from '@/api/registry-api'
import { getStorageStatus } from '@/api/storage-api'
import { StorageConfigurationWizard } from '@/components/storage/storage-configuration-wizard'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
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
import {
  MultiStepForm,
  type MultiStepFormNavigationProps,
  type MultiStepFormRef,
  type MultiStepFormStep,
} from '@/components/ui/multi-step-form'
import type { StorageStatusQuery } from '@/generated/graphql'
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
  // {
  //   key: 'config.allow_user_registration',
  //   type: 'boolean',
  //   label: 'Allow User Registration',
  //   description: 'Allow new users to register accounts themselves',
  //   defaultValue: true,
  // },
  // {
  //   key: 'config.default_user_role',
  //   type: 'select',
  //   label: 'Default User Role',
  //   description: 'Default role assigned to new users',
  //   defaultValue: 'viewer',
  //   options: ['viewer', 'editor'],
  // },
]

// Step Content Components
interface AccountStepContentProps extends MultiStepFormNavigationProps {
  form: UseFormReturn<AdminSetupForm>
  error: string | null
  isFormValid: boolean
  onCreateAccount: () => Promise<boolean>
}

function AccountStepContent({
  form,
  error,
  isFormValid,
  onCreateAccount,
  next,
}: AccountStepContentProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      const success = await onCreateAccount()
      if (success) {
        await next()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
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

          <div className='mt-6 flex items-center justify-end border-t pt-6'>
            <ButtonWithLoading
              type='submit'
              isLoading={isLoading}
              disabled={!isFormValid}
              className='flex items-center gap-2'
            >
              Create Account
            </ButtonWithLoading>
          </div>
        </form>
      </Form>
    </div>
  )
}

interface SystemSettingsStepContentProps extends MultiStepFormNavigationProps {
  settings: SystemSetting[]
  onNext: () => Promise<boolean>
  onSkip: () => boolean
}

function SystemSettingsStepContent({
  settings,
  onNext,
  onSkip,
  next,
  skip,
}: SystemSettingsStepContentProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleNext = async () => {
    setIsLoading(true)
    try {
      const success = await onNext()
      if (success) {
        await next()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    onSkip()
    skip()
  }

  return (
    <div className='space-y-6'>
      <SystemSettingsForm
        title=''
        description='These settings can be changed later in the admin panel.'
        settings={settings}
        initialValues={{}}
        systemRegistryList={[]}
        hideUpdateButton={true}
        showCard={false}
      />

      {/* Navigation */}
      <div className='mt-6 flex items-center justify-between border-t pt-6'>
        <Button variant='outline' onClick={handleSkip} disabled={isLoading}>
          Skip for Now
        </Button>
        <ButtonWithLoading
          onClick={handleNext}
          isLoading={isLoading}
          className='flex items-center gap-2'
        >
          Next
        </ButtonWithLoading>
      </div>
    </div>
  )
}

interface StorageStepContentProps extends MultiStepFormNavigationProps {
  onStorageConfigured: (restartRequired: boolean) => void
}

function StorageStepContent({ onStorageConfigured }: StorageStepContentProps) {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <p className='text-muted-foreground'>Configure where your images will be stored</p>
      </div>
      <StorageConfigurationWizard onSuccess={onStorageConfigured} showCancel={false} />
    </div>
  )
}

export function AdminSetupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [settingsFormValues] = useState<Record<string, string>>({})
  const [storageStatus, setStorageStatus] = useState<StorageStatusQuery['storageStatus'] | null>(
    null,
  )
  const navigate = useNavigate()
  const { authState } = useAuth()
  const multiStepFormRef = useRef<MultiStepFormRef>(null)

  // Fetch storage status to check if it's overridden by external config
  useEffect(() => {
    const fetchStorageStatus = async () => {
      try {
        const status = await getStorageStatus()
        setStorageStatus(status)
      } catch (error) {
        console.error('Failed to fetch storage status:', error)
      }
    }
    fetchStorageStatus()
  }, [])

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
    // Use the exposed next method instead of hard navigation
    multiStepFormRef.current?.next()
  }

  if (!authState.isFirstRun) {
    return <Navigate to='/' replace />
  }

  // Build steps array, conditionally excluding storage step if overridden by external config
  const allSteps: MultiStepFormStep[] = [
    {
      id: 'account',
      title: 'Create Admin Account',
      content: (navigationProps: MultiStepFormNavigationProps) => {
        return (
          <AccountStepContent
            form={form}
            error={error}
            isFormValid={isFormValid}
            onCreateAccount={handleCreateAccount}
            {...navigationProps}
          />
        )
      },
    },
    {
      id: 'settings',
      title: 'System Configuration',
      content: (navigationProps: MultiStepFormNavigationProps) => {
        return (
          <SystemSettingsStepContent
            settings={SYSTEM_SETTINGS}
            onNext={handleSystemSettingsNext}
            onSkip={handleSkipSettings}
            {...navigationProps}
          />
        )
      },
    },
    {
      id: 'storage',
      title: 'Storage Configuration',
      content: (navigationProps: MultiStepFormNavigationProps) => {
        return (
          <StorageStepContent onStorageConfigured={handleStorageConfigured} {...navigationProps} />
        )
      },
    },
  ]

  // Filter out storage step if it's overridden by external config
  const steps = storageStatus?.isOverriddenByConfig
    ? allSteps.filter((step) => step.id !== 'storage')
    : allSteps

  return (
    <div className='bg-background flex min-h-screen items-center justify-center p-4'>
      <MultiStepForm
        ref={multiStepFormRef}
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
