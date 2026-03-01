import { useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as z from 'zod'

import { registerAdmin } from '@/api/auth-api'
import { setSystemRegistryObject } from '@/api/registry-api'
import { LanguageSelector } from '@/components/language-selector'
import { ModeToggle } from '@/components/mode-toggle.tsx'
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
import { useBrand } from '@/hooks/use-brand'
import { useFormErrors } from '@/hooks/use-form-errors'
import type { AdminSetupLoaderData } from '@/loaders/admin-setup-loader'
import { initAuth, useAuth } from '@/stores/auth-store'
import { setHomeTitle } from '@/stores/folder-tree-store'

type AdminSetupForm = {
  username: string
  password: string
  confirmPassword: string
}

// Define system settings for step 3 - will be translated in component
// Note: Language is now set during admin registration (step 1), not here
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
  onCreateAccount: () => Promise<boolean>
}

function AccountStepContent({ form, error, onCreateAccount, next }: AccountStepContentProps) {
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
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.admin.username')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('forms.placeholders.enterUsername')}
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
              disabled={isLoading}
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
      <p className='text-muted-foreground text-sm'>{t('pages.admin.systemSettingsDescription')}</p>

      <SystemSettingsForm
        title=''
        description=''
        settings={settings}
        initialValues={formValues}
        systemRegistryList={[]}
        onFormChange={onFormValuesChange}
        hideUpdateButton={true}
        showCard={false}
        compact={true}
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
  const { t, i18n } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [settingsFormValues, setSettingsFormValues] = useState<Record<string, string>>({})
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)
  const navigate = useNavigate()
  const router = useRouter()
  const { authState } = useAuth()
  const { title: appTitle, url: appUrl } = useBrand()
  const multiStepFormRef = useRef<MultiStepFormRef>(null)

  // Initialize form error handler
  const { handleFormError } = useFormErrors<AdminSetupForm>()

  // Create translation-aware validation schema
  const adminSetupSchema = z
    .object({
      username: z
        .string()
        .min(3, t('forms.validation.usernameMinLength'))
        .max(30, t('forms.validation.usernameMaxLength'))
        .regex(/^[a-zA-Z0-9_-]+$/, t('forms.validation.usernamePattern')),
      password: z
        .string()
        .min(8, t('forms.validation.passwordTooShort', { min: 8 }))
        .max(72, t('forms.validation.passwordMaxLength')),
      confirmPassword: z
        .string()
        .min(8, t('forms.validation.passwordTooShort', { min: 8 }))
        .max(72, t('forms.validation.passwordMaxLength')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('forms.validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })

  // Create translated system settings
  const SYSTEM_SETTINGS = createSystemSettings(t)

  const { storageStatus } = useLoaderData({ from: '/admin-setup' }) as AdminSetupLoaderData

  const form = useForm<AdminSetupForm>({
    resolver: zodResolver(adminSetupSchema),
    mode: 'onBlur',
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  })

  const handleCreateAccount = async (): Promise<boolean> => {
    setError(null)

    const values = form.getValues()
    const isValid = await form.trigger()

    if (!isValid) {
      return false
    }

    try {
      // Use username as display name initially
      const displayName = values.username

      const response = await registerAdmin({
        displayName,
        username: values.username,
        password: values.password,
        defaultLanguage: selectedLanguage,
      })

      // Initialize auth with the new token
      await initAuth(response.token)
      await router.invalidate()
      return true
    } catch (err) {
      // Use the hook for simplified error handling
      handleFormError(
        err,
        form.setError,
        {
          username: {
            ALREADY_EXISTS: t('forms.validation.usernameExists'),
            INVALID_INPUT: t('forms.validation.usernameInvalid'),
          },
          password: {
            INVALID_INPUT: t('forms.validation.passwordInvalid'),
          },
        },
        t('pages.admin.failedToCreateAccount'),
      )
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

        // Check secondary key for dual-select
        if (setting.type === 'dual-select' && setting.secondaryKey) {
          const currentSecondaryValue = settingsFormValues[setting.secondaryKey]
          const secondaryDefaultValue = setting.secondaryDefaultValue?.toString() || ''
          if (currentSecondaryValue && currentSecondaryValue !== secondaryDefaultValue) {
            changedValues[setting.secondaryKey] = currentSecondaryValue
          }
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
      toast.error(t('pages.admin.failedToSaveSettings'))
      return false
    }
  }

  const handleSkipSettings = () => {
    return true
  }

  const handleStorageConfigured = (restartRequired: boolean) => {
    if (restartRequired) {
      toast.success(t('pages.admin.storageConfiguredRestart'))
    } else {
      toast.success(t('pages.admin.storageConfiguredSuccess'))
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
    <div className='min-h-screen-safe flex flex-col'>
      <div className='flex items-center gap-2 border-b px-3 py-2 sm:px-6 sm:py-3'>
        <div className='flex flex-1'>
          <a
            href={appUrl}
            target='_blank'
            className='text-foreground hover:text-foreground/80 text-base font-bold transition-colors sm:text-lg md:text-xl'
          >
            {appTitle}
          </a>
        </div>
        <div className='ml-auto flex items-center gap-1 sm:gap-2'>
          <LanguageSelector onLanguageChange={setSelectedLanguage} />
          <ModeToggle />
        </div>
      </div>
      <div className='bg-background flex flex-1 items-start justify-center px-4 py-4 sm:px-6 sm:py-6 md:items-center'>
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
    </div>
  )
}
