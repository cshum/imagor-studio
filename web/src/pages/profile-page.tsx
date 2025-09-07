import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { extractErrorMessage } from '@/lib/error-utils'
import type { ProfileLoaderData } from '@/loaders/account-loader'
import { initAuth, useAuth } from '@/stores/auth-store'

const profileSchema = z.object({
  displayName: z
    .string()
    .min(3, 'Display name must be at least 3 characters long')
    .max(100, 'Display name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(72, 'Password must be less than 72 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface ProfilePageProps {
  loaderData?: ProfileLoaderData
}

export function ProfilePage({ loaderData }: ProfilePageProps) {
  const { authState } = useAuth()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  // Use loader data if available, fallback to auth state
  const profileData = loaderData?.profile || {
    displayName: authState.profile?.displayName || '',
    email: authState.profile?.email || '',
  }

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profileData.displayName,
      email: profileData.email,
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
        email: values.email,
      })
      await initAuth()
      toast.success('Profile updated successfully!')
    } catch (err) {
      const errorMessage = extractErrorMessage(err)

      // Check if it's a validation error that should highlight a field
      if (
        errorMessage.toLowerCase().includes('email') &&
        errorMessage.toLowerCase().includes('already')
      ) {
        profileForm.setError('email', { message: 'This email is already in use' })
      } else if (errorMessage.toLowerCase().includes('email')) {
        profileForm.setError('email', { message: errorMessage })
      } else if (errorMessage.toLowerCase().includes('display name')) {
        profileForm.setError('displayName', { message: errorMessage })
      } else {
        // Unexpected error - show toast
        toast.error(`Failed to update profile: ${errorMessage}`)
      }
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onPasswordSubmit = async (values: PasswordForm) => {
    setIsUpdatingPassword(true)

    try {
      await changePassword(values.currentPassword, values.newPassword)
      toast.success('Password updated successfully!')
      passwordForm.reset()
      setPasswordDialogOpen(false)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)

      // Check if it's a validation error that should highlight a field
      if (errorMessage.toLowerCase().includes('current password')) {
        passwordForm.setError('currentPassword', { message: 'Current password is incorrect' })
      } else if (errorMessage.toLowerCase().includes('password')) {
        passwordForm.setError('newPassword', { message: errorMessage })
      } else {
        // Unexpected error - show toast
        toast.error(`Failed to update password: ${errorMessage}`)
      }
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your account profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className='space-y-4'>
              <FormField
                control={profileForm.control}
                name='displayName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Enter your display name'
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
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='Enter your email address'
                        {...field}
                        disabled={isUpdatingProfile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ButtonWithLoading type='submit' isLoading={isUpdatingProfile}>
                Update Profile
              </ButtonWithLoading>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage your account security and password.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between rounded-lg border p-4'>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>Password</div>
              <div className='text-muted-foreground text-sm'>Change your account password</div>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant='outline'>Change Password</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one.
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
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder='Enter your current password'
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
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder='Enter your new password'
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
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder='Confirm your new password'
                              {...field}
                              disabled={isUpdatingPassword}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className='flex justify-end space-x-2'>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => setPasswordDialogOpen(false)}
                        disabled={isUpdatingPassword}
                      >
                        Cancel
                      </Button>
                      <ButtonWithLoading type='submit' isLoading={isUpdatingPassword}>
                        Update Password
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
