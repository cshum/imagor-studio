import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import * as z from 'zod'

import { changePassword, updateProfile } from '@/api/user-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { extractErrorInfo, extractFieldErrors } from '@/lib/error-utils'
import type { ProfileLoaderData } from '@/loaders/account-loader'
import { initAuth, useAuth } from '@/stores/auth-store'

interface ProfilePageProps {
  loaderData?: ProfileLoaderData
}

export function ProfilePage({ loaderData }: ProfilePageProps) {
  const { t } = useTranslation()
  const { authState } = useAuth()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  // Create translation-aware validation schemas
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

  // Use loader data if available, fallback to auth state
  const profileData = loaderData?.profile || {
    displayName: authState.profile?.displayName || '',
    username: authState.profile?.username || '',
  }

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
      await updateProfile({
        displayName: values.displayName,
        username: values.username,
      })
      await initAuth()
      toast.success(t('pages.profile.profileUpdatedSuccess'))
    } catch (err) {
      // Use field-based error handling instead of string parsing
      const errorInfo = extractErrorInfo(err)
      const fieldErrors = extractFieldErrors(err)

      // Check for field-specific errors first
      if (fieldErrors.username) {
        // Use translated message for username conflicts
        if (errorInfo.code === 'ALREADY_EXISTS') {
          profileForm.setError('username', { message: t('pages.profile.usernameAlreadyInUse') })
        } else {
          profileForm.setError('username', { message: fieldErrors.username })
        }
      } else if (fieldErrors.displayName) {
        profileForm.setError('displayName', { message: fieldErrors.displayName })
      } else if (errorInfo.field === 'username') {
        // Fallback to single error with field targeting
        if (errorInfo.code === 'ALREADY_EXISTS') {
          profileForm.setError('username', { message: t('pages.profile.usernameAlreadyInUse') })
        } else {
          profileForm.setError('username', { message: errorInfo.message })
        }
      } else if (errorInfo.field === 'displayName') {
        profileForm.setError('displayName', { message: errorInfo.message })
      } else {
        // No field targeting - show general error
        toast.error(`${t('pages.profile.updateProfileFailed')}: ${errorInfo.message}`)
      }
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
      // Use field-based error handling instead of string parsing
      const errorInfo = extractErrorInfo(err)
      const fieldErrors = extractFieldErrors(err)

      // Check for field-specific errors first
      if (fieldErrors.currentPassword) {
        passwordForm.setError('currentPassword', {
          message: t('pages.profile.currentPasswordIncorrect'),
        })
      } else if (fieldErrors.newPassword) {
        passwordForm.setError('newPassword', { message: fieldErrors.newPassword })
      } else if (errorInfo.field === 'currentPassword') {
        passwordForm.setError('currentPassword', {
          message: t('pages.profile.currentPasswordIncorrect'),
        })
      } else if (errorInfo.field === 'newPassword') {
        passwordForm.setError('newPassword', { message: errorInfo.message })
      } else {
        // No field targeting - show general error
        toast.error(`${t('pages.profile.updatePasswordFailed')}: ${errorInfo.message}`)
      }
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.profile.profileInformation')}</CardTitle>
          <CardDescription>{t('pages.profile.profileInformationDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className='space-y-4'>
              <FormField
                control={profileForm.control}
                name='displayName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.profile.displayName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('pages.profile.displayNamePlaceholder')}
                        {...field}
                        disabled={isUpdatingProfile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.username')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('pages.profile.usernamePlaceholder')}
                        {...field}
                        disabled={isUpdatingProfile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end pt-2'>
                <ButtonWithLoading type='submit' isLoading={isUpdatingProfile}>
                  {t('pages.profile.updateProfile')}
                </ButtonWithLoading>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.profile.securitySettings')}</CardTitle>
          <CardDescription>{t('pages.profile.securitySettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0'>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>{t('pages.profile.password')}</div>
              <div className='text-muted-foreground text-sm'>
                {t('pages.profile.passwordDescription')}
              </div>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant='outline' className='sm:ml-4'>
                  {t('pages.profile.changePassword')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('pages.profile.changePasswordTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('pages.profile.changePasswordDescription')}
                  </DialogDescription>
                </DialogHeader>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className='space-y-4'
                  >
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
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
