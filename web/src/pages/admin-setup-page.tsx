import { useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
import { setSystemRegistryObject } from '@/api/registry-api'
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
import type { AdminSetupLoaderData } from '@/loaders/admin-setup-loader'
import { initAuth, useAuth } from '@/stores/auth-store'
import { setHomeTitle } from '@/stores/folder-tree-store'

type AdminSetupForm = {
  email: string
  password: string
}

// Define system settings for step 2 - will be translated in component
const createSystemSettings = (t: (key: string) => string): SystemSetting[] => [
  {
    key: 'config.app_home_title',
    type: 'text',
    label: t('pages.admin.homeTitle'),
    description: t('pages.admin.homeTitleDescription'),
    defaultValue: 'Home',
  },
  {
    key: 'config.allow_guest_mode',
    type: 'boolean',
    label: t('pages.admin.guestMode'),
    description: t('pages.admin.guestModeDescription'),
    defaultValue: false,
  },
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
  const { t } = useTranslation()
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
                  <FormLabel>{t('pages.admin.emailAddress')}</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder={t('forms.placeholders.enterEmail')}
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
                  <FormLabel>{t('pages.admin.password')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={t('forms.placeholders.enterPassword')}
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
              {t('pages.admin.createAccount')}
            </ButtonWithLoading>
          </div>
        </form>
      </Form>
    </div>
  )
}

interface SystemSettingsStepContentProps extends MultiStepFormNavigationProps {
  settings: SystemSetting[]
  formValues: Record<string, string>
  onFormValuesChange: (values: Record<string, string>) => void
  onNext: () => Promise<boolean>
  onSkip: () => boolean
}

function SystemSettingsStepContent({
  settings,
  formValues,
  onFormValuesChange,
  onNext,
  onSkip,
  next,
  skip,
}: SystemSettingsStepContentProps) {
  const { t } = useTranslation()
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
        description={t('pages.admin.systemSettingsDescription')}
        settings={settings}
        initialValues={formValues}
        systemRegistryList={[]}
        onFormChange={onFormValuesChange}
        hideUpdateButton={true}
        showCard={false}
      />

      {/* Navigation */}
      <div className='mt-6 flex items-center justify-between border-t pt-6'>
        <Button variant='outline' onClick={handleSkip} disabled={isLoading}>
          {t('pages.admin.skipForNow')}
        </Button>
        <ButtonWithLoading
          onClick={handleNext}
          isLoading={isLoading}
          className='flex items-center gap-2'
        >
          {t('pages.admin.next')}
        </ButtonWithLoading>
      </div>
    </div>
  )
}

interface StorageStepContentProps extends MultiStepFormNavigationProps {
  onStorageConfigured: (restartRequired: boolean) => void
}

function StorageStepContent({ onStorageConfigured }: StorageStepContentProps) {
  const { t } = useTranslation()
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <p className='text-muted-foreground'>{t('pages.admin.storageDescription')}</p>
      </div>
      <StorageConfigurationWizard onSuccess={onStorageConfigured} showCancel={false} />
    </div>
  )
}

export function AdminSetupPage() {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [settingsFormValues, setSettingsFormValues] = useState<Record<string, string>>({})
  const navigate = useNavigate()
  const router = useRouter()
  const { authState } = useAuth()
  const multiStepFormRef = useRef<MultiStepFormRef>(null)

  // Create translation-aware validation schema
  const adminSetupSchema = z.object({
    email: z.email(t('auth.validation.invalidEmail')),
    password: z
      .string()
      .min(8, t('forms.validation.passwordTooShort', { min: 8 }))
      .max(72, 'Password must be less than 72 characters'),
  })

  // Create translated system settings
  const SYSTEM_SETTINGS = createSystemSettings(t)

  const { storageStatus } = useLoaderData({ from: '/admin-setup' }) as AdminSetupLoaderData

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
      await router.invalidate()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pages.admin.failedToCreateAccount'))
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

        // Update the store immediately if home title was changed
        if (changedValues['config.app_home_title']) {
          setHomeTitle(changedValues['config.app_home_title'])
        }
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
      title: t('pages.admin.createAdminAccount'),
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
      id: 'storage',
      title: t('pages.admin.storageConfiguration'),
      content: (navigationProps: MultiStepFormNavigationProps) => {
        return (
          <StorageStepContent onStorageConfigured={handleStorageConfigured} {...navigationProps} />
        )
      },
    },
    {
      id: 'settings',
      title: t('pages.admin.systemConfiguration'),
      content: (navigationProps: MultiStepFormNavigationProps) => {
        return (
          <SystemSettingsStepContent
            settings={SYSTEM_SETTINGS}
            formValues={settingsFormValues}
            onFormValuesChange={setSettingsFormValues}
            onNext={handleSystemSettingsNext}
            onSkip={handleSkipSettings}
            {...navigationProps}
          />
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
        title={t('pages.admin.welcome')}
        description={t('pages.admin.setupDescription')}
        className='w-full max-w-2xl'
      />
    </div>
  )
}
