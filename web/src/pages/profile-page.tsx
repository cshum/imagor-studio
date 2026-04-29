import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import * as z from 'zod'

import {
  changePassword,
  requestEmailChange,
  unlinkAuthProvider,
  updateProfile,
} from '@/api/user-api'
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
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import { useFormErrors } from '@/hooks/use-form-errors'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import type { ProfileLoaderData } from '@/loaders/account-loader'
import { initAuth, useAuth } from '@/stores/auth-store'

interface ProfilePageProps {
  loaderData?: ProfileLoaderData
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProfilePage({ loaderData }: ProfilePageProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)

  const { handleFormError } = useFormErrors<ProfileForm>()
  const { handleFormError: handlePasswordError } = useFormErrors<PasswordForm>()
  const { handleFormError: handleEmailError } = useFormErrors<EmailForm>()

  const profileSchema = z.object({
    displayName: z
      .string()
      .min(3, t('forms.validation.displayNameMinLength'))
      .max(100, t('forms.validation.displayNameMaxLength')),
    username: z
      .string()
      .min(3, t('forms.validation.usernameMinLength'))
      .max(30, t('forms.validation.usernameMaxLength'))
      .regex(/^[a-zA-Z0-9_-]+$/, t('forms.validation.usernamePattern')),
  })

  const emailSchema = z.object({
    email: z.string().trim().refine(isValidEmail, t('pages.profile.invalidEmail')),
  })

  type ProfileForm = z.infer<typeof profileSchema>
  type PasswordForm = {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }
  type EmailForm = z.infer<typeof emailSchema>

  const profileData = loaderData?.profile || {
    displayName: authState.profile?.displayName || '',
    username: authState.profile?.username || '',
    email: authState.profile?.email || null,
    pendingEmail: authState.profile?.pendingEmail || null,
    emailVerified: authState.profile?.emailVerified || false,
    hasPassword: authState.profile?.hasPassword || false,
    avatarUrl: authState.profile?.avatarUrl || null,
    authProviders: authState.profile?.authProviders || [],
  }

  const email = profileData.email
  const pendingEmail = profileData.pendingEmail
  const emailVerified = profileData.emailVerified
  const hasPassword = profileData.hasPassword
  const authProviders = profileData.authProviders
  const primaryProvider = authProviders[0] || null
  const canManageEmailInApp = hasPassword
  const normalizedCurrentEmail = normalizeEmail(email || '')
  const normalizedPendingEmail = normalizeEmail(pendingEmail || '')

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: hasPassword
            ? z.string().min(1, t('forms.validation.currentPasswordRequired'))
            : z.string(),
          newPassword: z
            .string()
            .min(8, t('forms.validation.passwordMinLength'))
            .max(72, t('forms.validation.passwordMaxLength')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t('forms.validation.passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
    [hasPassword, t],
  )

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profileData.displayName,
      username: profileData.username,
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: pendingEmail || email || '',
    },
  })

  const onProfileSubmit = async (values: ProfileForm) => {
    setIsUpdatingProfile(true)
    try {
      await updateProfile({ displayName: values.displayName, username: values.username })
      await initAuth()
      toast.success(t('pages.profile.profileUpdatedSuccess'))
    } catch (err) {
      handleFormError(
        err,
        profileForm.setError,
        { username: { ALREADY_EXISTS: 'pages.profile.usernameAlreadyInUse' } },
        t('pages.profile.updateProfileFailed'),
      )
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onPasswordSubmit = async (values: PasswordForm) => {
    setIsUpdatingPassword(true)
    try {
      await changePassword(values.currentPassword, values.newPassword)
      toast.success(t('pages.profile.passwordUpdatedSuccess'))
      passwordForm.reset()
      setPasswordDialogOpen(false)
    } catch (err) {
      handlePasswordError(
        err,
        passwordForm.setError,
        { currentPassword: { '*': 'pages.profile.currentPasswordIncorrect' } },
        t('pages.profile.updatePasswordFailed'),
      )
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const onEmailSubmit = async (values: EmailForm) => {
    const nextEmail = normalizeEmail(values.email)
    if (!canManageEmailInApp) {
      emailForm.setError('email', {
        type: 'manual',
        message: t('pages.profile.emailChangeManaged'),
      })
      return
    }
    if (nextEmail === normalizedCurrentEmail || nextEmail === normalizedPendingEmail) {
      emailForm.setError('email', {
        type: 'manual',
        message: t('pages.profile.emailChangeUnchanged'),
      })
      return
    }

    setIsUpdatingEmail(true)
    try {
      const result = await requestEmailChange(nextEmail)
      await initAuth()
      emailForm.reset({ email: result.email })
      setEmailDialogOpen(false)
      toast.success(t('pages.profile.emailChangeRequestedSuccess'))
    } catch (err) {
      handleEmailError(
        err,
        emailForm.setError,
        { email: { ALREADY_EXISTS: 'pages.profile.emailAlreadyInUse' } },
        t('pages.profile.emailChangeRequestFailed'),
      )
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleUnlinkProvider = async (provider: string) => {
    setUnlinkingProvider(provider)
    try {
      await unlinkAuthProvider(provider)
      await initAuth()
      setProviderDialogOpen(false)
      toast.success(t('pages.profile.providerUnlinkedSuccess'))
    } catch (err) {
      handleFormError(err, profileForm.setError, undefined, t('pages.profile.providerUnlinkFailed'))
    } finally {
      setUnlinkingProvider(null)
    }
  }

  return (
    <div className='space-y-10'>
      {/* ── Profile information ─────────────────────────────────────── */}
      <SettingsSection
        title={t('pages.profile.profileInformation')}
        description={t('pages.profile.profileInformationDescription')}
      >
        {authState.multiTenant && (
          <SettingRow
            label={t('pages.profile.email')}
            description={
              !canManageEmailInApp && authProviders.length > 0
                ? t('pages.profile.emailChangeManaged')
                : pendingEmail
                  ? t('pages.profile.emailChangePending')
                  : emailVerified
                    ? t('pages.profile.emailVerified')
                    : t('pages.profile.emailVerificationPending')
            }
            contentClassName='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end sm:max-w-none'
          >
            <div className='min-w-0 text-left text-sm font-medium break-all sm:text-right'>
              {email || t('pages.profile.noEmail')}
            </div>
            {canManageEmailInApp ? (
              <Button variant='outline' type='button' onClick={() => setEmailDialogOpen(true)}>
                {t('pages.profile.changeEmail')}
              </Button>
            ) : null}
          </SettingRow>
        )}

        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <FormField
              control={profileForm.control}
              name='displayName'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('pages.profile.displayName')}
                    description={t('pages.profile.displayNameDescription')}
                  >
                    <FormControl>
                      <Input
                        placeholder={t('pages.profile.displayNamePlaceholder')}
                        {...field}
                        disabled={isUpdatingProfile}
                      />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />
            <FormField
              control={profileForm.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <SettingRow
                    label={t('common.labels.username')}
                    description={t('pages.profile.usernameDescription')}
                    last
                  >
                    <FormControl>
                      <Input
                        placeholder={t('pages.profile.usernamePlaceholder')}
                        {...field}
                        disabled={isUpdatingProfile}
                      />
                    </FormControl>
                    <FormMessage className='mt-1.5' />
                  </SettingRow>
                </FormItem>
              )}
            />
            <div className='mt-2 flex justify-end pt-2'>
              <ButtonWithLoading type='submit' isLoading={isUpdatingProfile}>
                {t('pages.profile.updateProfile')}
              </ButtonWithLoading>
            </div>
          </form>
        </Form>
      </SettingsSection>

      {/* ── Security ────────────────────────────────────────────────── */}
      <SettingsSection
        title={t('pages.profile.securitySettings')}
        description={t('pages.profile.securitySettingsDescription')}
      >
        {authState.multiTenant && (
          <SettingRow
            label={t('pages.profile.loginMethods')}
            description={primaryProvider?.email || t('pages.profile.loginMethodsSummary')}
            contentClassName='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end sm:max-w-none'
          >
            <div className='min-w-0 text-left text-sm font-medium sm:text-right'>
              {primaryProvider
                ? t(`pages.profile.providers.${primaryProvider.provider.toLowerCase()}`, {
                    defaultValue: primaryProvider.provider,
                  })
                : t('pages.profile.noAuthProviders')}
            </div>
            {authProviders.length > 0 && (
              <Button variant='outline' type='button' onClick={() => setProviderDialogOpen(true)}>
                {t('pages.profile.manage')}
              </Button>
            )}
          </SettingRow>
        )}

        <SettingRow
          label={t('pages.profile.password')}
          description={
            hasPassword
              ? t('pages.profile.passwordDescription')
              : t('pages.profile.passwordNotSetDescription')
          }
          last
          contentClassName='flex justify-end sm:max-w-xs'
        >
          <Button variant='outline' onClick={() => setPasswordDialogOpen(true)}>
            {hasPassword ? t('pages.profile.changePassword') : t('pages.profile.setPassword')}
          </Button>
        </SettingRow>
      </SettingsSection>

      {/* ── Change password dialog ───────────────────────────────────── */}
      <ResponsiveDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <ResponsiveDialogHeader>
          <div className='text-lg font-semibold'>
            {hasPassword
              ? t('pages.profile.changePasswordTitle')
              : t('pages.profile.setPasswordTitle')}
          </div>
          <ResponsiveDialogDescription>
            {hasPassword
              ? t('pages.profile.changePasswordDescription')
              : t('pages.profile.setPasswordDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className='space-y-3'>
            {hasPassword && (
              <FormField
                control={passwordForm.control}
                name='currentPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.profile.currentPassword')}</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('pages.profile.currentPasswordPlaceholder')}
                        {...field}
                        disabled={isUpdatingPassword}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={passwordForm.control}
              name='newPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.profile.newPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={t('pages.profile.newPasswordPlaceholder')}
                      {...field}
                      disabled={isUpdatingPassword}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.profile.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={t('pages.profile.confirmPasswordPlaceholder')}
                      {...field}
                      disabled={isUpdatingPassword}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setPasswordDialogOpen(false)}
                disabled={isUpdatingPassword}
              >
                {t('common.buttons.cancel')}
              </Button>
              <ButtonWithLoading type='submit' isLoading={isUpdatingPassword}>
                {hasPassword ? t('pages.profile.updatePassword') : t('pages.profile.setPassword')}
              </ButtonWithLoading>
            </div>
          </form>
        </Form>
      </ResponsiveDialog>

      <ResponsiveDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <ResponsiveDialogHeader>
          <div className='text-lg font-semibold'>{t('pages.profile.changeEmailTitle')}</div>
          <ResponsiveDialogDescription>
            {t('pages.profile.changeEmailDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className='space-y-3'>
            <FormField
              control={emailForm.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pages.profile.email')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isUpdatingEmail} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='text-muted-foreground text-sm'>
              {t('pages.profile.emailChangeHelp')}
            </div>
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setEmailDialogOpen(false)}
                disabled={isUpdatingEmail}
              >
                {t('common.buttons.cancel')}
              </Button>
              <ButtonWithLoading type='submit' isLoading={isUpdatingEmail}>
                {t('pages.profile.requestEmailChange')}
              </ButtonWithLoading>
            </div>
          </form>
        </Form>
      </ResponsiveDialog>

      <ResponsiveDialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <ResponsiveDialogHeader>
          <div className='text-lg font-semibold'>{t('pages.profile.manageSignInTitle')}</div>
          <ResponsiveDialogDescription>
            {t('pages.profile.manageSignInDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className='space-y-3'>
          {authProviders.length > 0 ? (
            authProviders.map((provider) => {
              const providerKey = provider.provider.toLowerCase()
              const isUnlinking = unlinkingProvider === provider.provider

              return (
                <div
                  key={`${provider.provider}-${provider.linkedAt}`}
                  className='flex items-center justify-between gap-4 rounded-md border px-3 py-3'
                >
                  <div className='min-w-0'>
                    <div className='text-sm font-medium'>
                      {t(`pages.profile.providers.${providerKey}`, {
                        defaultValue: provider.provider,
                      })}
                    </div>
                    <div className='text-muted-foreground truncate text-xs'>
                      {provider.email || t('pages.profile.noProviderEmail')}
                    </div>
                  </div>
                  <ButtonWithLoading
                    type='button'
                    variant='outline'
                    isLoading={isUnlinking}
                    disabled={authProviders.length <= 1 || isUnlinking}
                    onClick={() => handleUnlinkProvider(provider.provider)}
                  >
                    {t('pages.profile.unlink')}
                  </ButtonWithLoading>
                </div>
              )
            })
          ) : (
            <div className='text-muted-foreground text-sm'>
              {t('pages.profile.noAuthProviders')}
            </div>
          )}

          <div className='text-muted-foreground text-sm'>
            {authProviders.length <= 1
              ? t('pages.profile.unlinkLastProviderWarning')
              : t('pages.profile.unlinkProviderDescription')}
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  )
}
