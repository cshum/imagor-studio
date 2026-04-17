import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import * as z from 'zod'

import { changePassword, updateProfile } from '@/api/user-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  const { handleFormError } = useFormErrors<ProfileForm>()
  const { handleFormError: handlePasswordError } = useFormErrors<PasswordForm>()

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

  const passwordSchema = z
    .object({
      currentPassword: z.string().min(1, t('forms.validation.currentPasswordRequired')),
      newPassword: z
        .string()
        .min(8, t('forms.validation.passwordMinLength'))
        .max(72, t('forms.validation.passwordMaxLength')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('forms.validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })

  type ProfileForm = z.infer<typeof profileSchema>
  type PasswordForm = z.infer<typeof passwordSchema>

  const profileData = loaderData?.profile || {
    displayName: authState.profile?.displayName || '',
    username: authState.profile?.username || '',
  }

  const avatarUrl = authState.profile?.avatarUrl
  const displayName = profileData.displayName || profileData.username || ''
  const initials = (() => {
    const words = displayName.trim().split(/\s+/).filter(Boolean)
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
    return displayName.slice(0, 2).toUpperCase() || '?'
  })()

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

  return (
    <div className='space-y-10'>
      {/* ── Profile information ─────────────────────────────────────── */}
      <SettingsSection
        title={t('pages.profile.profileInformation')}
        description={t('pages.profile.profileInformationDescription')}
      >
        {/* ── Avatar (multi-tenant / SaaS mode only) ──────────────── */}
        {authState.multiTenant && (
          <SettingRow
            label={t('pages.profile.avatar')}
            description={
              avatarUrl ? t('pages.profile.avatarFromProvider') : t('pages.profile.avatarNoPhoto')
            }
          >
            <Avatar className='h-16 w-16'>
              <AvatarImage
                src={avatarUrl ?? undefined}
                referrerPolicy='no-referrer'
                alt={displayName}
              />
              <AvatarFallback className='text-sm font-semibold'>{initials}</AvatarFallback>
            </Avatar>
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
        <SettingRow
          label={t('pages.profile.password')}
          description={t('pages.profile.passwordDescription')}
          last
          contentClassName='flex justify-end sm:max-w-xs'
        >
          <Button variant='outline' onClick={() => setPasswordDialogOpen(true)}>
            {t('pages.profile.changePassword')}
          </Button>
        </SettingRow>
      </SettingsSection>

      {/* ── Change password dialog ───────────────────────────────────── */}
      <ResponsiveDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <ResponsiveDialogHeader>
          <div className='text-lg font-semibold'>{t('pages.profile.changePasswordTitle')}</div>
          <ResponsiveDialogDescription>
            {t('pages.profile.changePasswordDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className='space-y-3'>
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
                {t('pages.profile.updatePassword')}
              </ButtonWithLoading>
            </div>
          </form>
        </Form>
      </ResponsiveDialog>
    </div>
  )
}
